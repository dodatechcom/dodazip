use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs::File;
use std::io::{self, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use fuser::{
    FileAttr, FileType, Filesystem, MountOption, ReplyAttr, ReplyData, ReplyDirectory,
    ReplyEmpty, ReplyEntry, Request,
};
use libc::{ENOENT, EIO};

use crate::archive::ArchiveReader;
use crate::format::FileEntry;

fn secs_to_system_time(secs: u64) -> SystemTime {
    UNIX_EPOCH + Duration::from_secs(secs)
}

fn current_system_time() -> SystemTime {
    SystemTime::now()
}

pub struct ArchiveFilesystem {
    password:     Option<String>,
    inner:        Mutex<ArchiveFsInner>,
    /// Persistent open file handle so `read()` does not reopen the archive on
    /// every kernel call.
    ///
    /// FIX: the old code did `File::open()` + full archive re-parse on *every*
    /// single FUSE read() syscall.  A 4 KB read of a 1 GB file would decompress
    /// the entire file 100s of times.  We keep the file open here and seek to
    /// the beginning for each ArchiveReader construction, avoiding the OS
    /// open/close overhead.  Full chunk-range reads (decompress only the needed
    /// chunks) require ArchiveReader API changes and are left as a TODO.
    archive_file: Mutex<BufReader<File>>,
}

struct ArchiveFsInner {
    ino_to_node: HashMap<u64, FsNode>,
    path_to_ino: HashMap<PathBuf, u64>,
    next_ino:    u64,
}

struct FsNode {
    name:      String,
    parent:    u64,
    attr:      FileAttr,
    entry_idx: Option<usize>,
    children:  Vec<u64>,
}

impl ArchiveFilesystem {
    pub fn new(archive_path: &Path, password: Option<&str>) -> io::Result<Self> {
        let file = File::open(archive_path)?;
        let mut reader = BufReader::new(file);

        let archive_reader = ArchiveReader::new(&mut reader, password)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;

        let entries: Vec<FileEntry> = archive_reader.entries().iter().cloned().collect();
        let inner = Self::build_fs_tree(&entries)?;

        // Seek back to the start so the cached handle is ready for the first read().
        reader.seek(SeekFrom::Start(0))?;

        Ok(ArchiveFilesystem {
            password:     password.map(|s| s.to_string()),
            inner:        Mutex::new(inner),
            archive_file: Mutex::new(reader),
        })
    }

    fn build_fs_tree(entries: &[FileEntry]) -> io::Result<ArchiveFsInner> {
        let mut fs = ArchiveFsInner {
            ino_to_node: HashMap::new(),
            path_to_ino: HashMap::new(),
            next_ino:    2,
        };

        let now = current_system_time();
        let uid = unsafe { libc::getuid() };
        let gid = unsafe { libc::getgid() };

        let root_attr = FileAttr {
            ino:     1,
            size:    0,
            blocks:  0,
            atime:   now,
            mtime:   now,
            ctime:   now,
            crtime:  now,
            kind:    FileType::Directory,
            perm:    0o755,
            nlink:   2,
            uid,
            gid,
            rdev:    0,
            flags:   0,
            blksize: 512,
        };

        fs.ino_to_node.insert(1, FsNode {
            name:      String::from("/"),
            parent:    1, // root's parent is itself (POSIX convention)
            attr:      root_attr,
            entry_idx: None,
            children:  Vec::new(),
        });
        fs.path_to_ino.insert(PathBuf::from("/"), 1);

        for (idx, entry) in entries.iter().enumerate() {
            let file_path    = Path::new(&entry.path);
            let mut parent_ino   = 1u64;
            let mut current_path = PathBuf::from("/");

            if let Some(parent) = file_path.parent() {
                for component in parent.components() {
                    let component_str = component.as_os_str().to_string_lossy();
                    if component_str.is_empty() || component_str == "." {
                        continue;
                    }

                    current_path.push(component_str.as_ref());

                    if !fs.path_to_ino.contains_key(&current_path) {
                        let dir_ino = fs.next_ino;
                        fs.next_ino += 1;

                        let dir_attr = FileAttr {
                            ino:     dir_ino,
                            size:    0,
                            blocks:  0,
                            atime:   now,
                            mtime:   now,
                            ctime:   now,
                            crtime:  now,
                            kind:    FileType::Directory,
                            perm:    0o755,
                            nlink:   2,
                            uid,
                            gid,
                            rdev:    0,
                            flags:   0,
                            blksize: 512,
                        };

                        fs.ino_to_node.insert(dir_ino, FsNode {
                            name:      component_str.to_string(),
                            parent:    parent_ino,
                            attr:      dir_attr,
                            entry_idx: None,
                            children:  Vec::new(),
                        });

                        if let Some(pn) = fs.ino_to_node.get_mut(&parent_ino) {
                            pn.children.push(dir_ino);
                            pn.attr.nlink += 1;
                        }

                        fs.path_to_ino.insert(current_path.clone(), dir_ino);
                    }

                    parent_ino = *fs.path_to_ino.get(&current_path).unwrap();
                }
            }

            let file_name = file_path
                .file_name()
                .unwrap_or_else(|| OsStr::new(""))
                .to_string_lossy()
                .to_string();

            let file_ino  = fs.next_ino;
            fs.next_ino  += 1;

            let file_size  = entry.file_size;
            let blocks     = (file_size + 511) / 512;
            let mtime_secs = entry.mtime / 1_000_000_000;
            let mtime = if mtime_secs > 0 {
                secs_to_system_time(mtime_secs)
            } else {
                now
            };

            let file_attr = FileAttr {
                ino:     file_ino,
                size:    file_size,
                blocks,
                atime:   now,
                mtime,
                ctime:   mtime,
                crtime:  mtime,
                kind:    FileType::RegularFile,
                perm:    (entry.mode & 0o777) as u16,
                nlink:   1,
                uid,
                gid,
                rdev:    0,
                flags:   0,
                blksize: 512,
            };

            fs.ino_to_node.insert(file_ino, FsNode {
                name:      file_name,
                parent:    parent_ino,
                attr:      file_attr,
                entry_idx: Some(idx),
                children:  Vec::new(),
            });

            if let Some(pn) = fs.ino_to_node.get_mut(&parent_ino) {
                pn.children.push(file_ino);
            }
        }

        Ok(fs)
    }

    pub fn mount(self, mount_point: &Path) -> io::Result<()> {
        let options = vec![
            MountOption::RO,
            MountOption::DefaultPermissions,
            MountOption::FSName("dodazip".to_string()),
            MountOption::AutoUnmount,
        ];
        fuser::mount2(self, mount_point, &options)
    }
}

impl Filesystem for ArchiveFilesystem {
    fn lookup(&mut self, _req: &Request<'_>, parent: u64, name: &OsStr, reply: ReplyEntry) {
        let inner = self.inner.lock().unwrap();
        if let Some(parent_node) = inner.ino_to_node.get(&parent) {
            for &child_ino in &parent_node.children {
                if let Some(child) = inner.ino_to_node.get(&child_ino) {
                    if OsStr::new(&child.name) == name {
                        reply.entry(&Duration::from_secs(60), &child.attr, 0);
                        return;
                    }
                }
            }
        }
        reply.error(ENOENT);
    }

    fn getattr(&mut self, _req: &Request<'_>, ino: u64, _fh: Option<u64>, reply: ReplyAttr) {
        let inner = self.inner.lock().unwrap();
        if let Some(node) = inner.ino_to_node.get(&ino) {
            reply.attr(&Duration::from_secs(60), &node.attr);
        } else {
            reply.error(ENOENT);
        }
    }

    fn readdir(
        &mut self,
        _req:   &Request<'_>,
        ino:    u64,
        _fh:    u64,
        offset: i64,
        mut reply: ReplyDirectory,
    ) {
        let inner = self.inner.lock().unwrap();

        let Some(node) = inner.ino_to_node.get(&ino) else {
            reply.error(ENOENT);
            return;
        };

        if node.attr.kind != FileType::Directory {
            reply.error(ENOENT);
            return;
        }

        // FIX (`.`): inode for `.` must be the *current* directory's inode,
        // not the hard-coded constant 1.
        // FIX (`..`): root's parent inode must be 1 (itself), not 0 (invalid).
        // The `parent` field in every FsNode is already set correctly (root
        // has parent = 1) so we just use it directly.
        if offset == 0 {
            if reply.add(ino, 1, FileType::Directory, ".") {
                reply.ok();
                return;
            }
            if reply.add(node.parent, 2, FileType::Directory, "..") {
                reply.ok();
                return;
            }
        }

        for (idx, &child_ino) in node.children.iter().enumerate() {
            let entry_offset = (idx as i64) + 3; // 1-based, after . and ..
            if entry_offset <= offset {
                continue;
            }
            if let Some(child) = inner.ino_to_node.get(&child_ino) {
                if reply.add(child_ino, entry_offset, child.attr.kind, &child.name) {
                    break;
                }
            }
        }

        reply.ok();
    }

    fn open(&mut self, _req: &Request<'_>, ino: u64, _flags: i32, reply: fuser::ReplyOpen) {
        let inner = self.inner.lock().unwrap();
        match inner.ino_to_node.get(&ino) {
            Some(n) if n.attr.kind == FileType::RegularFile => reply.opened(0, 0),
            _                                               => reply.error(ENOENT),
        }
    }

    fn read(
        &mut self,
        _req:        &Request<'_>,
        ino:         u64,
        _fh:         u64,
        offset:      i64,
        size:        u32,
        _flags:      i32,
        _lock_owner: Option<u64>,
        reply:       ReplyData,
    ) {
        // Step 1: look up the archive entry index from the (already cached) FS tree.
        let entry_idx = {
            let inner = self.inner.lock().unwrap();
            match inner.ino_to_node.get(&ino) {
                Some(node) if node.attr.kind == FileType::RegularFile => node.entry_idx,
                _ => {
                    reply.error(ENOENT);
                    return;
                }
            }
        };

        let Some(idx) = entry_idx else {
            reply.error(ENOENT);
            return;
        };

        // Step 2: acquire the persistent file handle, seek to the beginning,
        // and build an ArchiveReader from it.
        //
        // FIX: the old code called File::open() on every read() — one OS file
        // open + full archive re-parse per 4 KB read.  We reuse the already-open
        // BufReader and just seek to 0.
        //
        // TODO: for further improvement, ArchiveReader should expose a
        // read_file_range(idx, offset, len) that seeks directly to the relevant
        // chunks using the chunk table rather than decompressing the entire file.
        let password = self.password.as_deref();

        let mut file_guard = match self.archive_file.lock() {
            Ok(g) => g,
            Err(_) => { reply.error(EIO); return; }
        };

        if file_guard.seek(SeekFrom::Start(0)).is_err() {
            reply.error(EIO);
            return;
        }

        let mut archive_reader = match ArchiveReader::new(&mut *file_guard, password) {
            Ok(r)  => r,
            Err(_) => { reply.error(EIO); return; }
        };

        let data = match archive_reader.read_file_by_index(idx) {
            Ok(d)  => d,
            Err(_) => { reply.error(EIO); return; }
        };

        let start = offset as usize;
        if start >= data.len() {
            reply.data(&[]);
            return;
        }

        let end = (start + size as usize).min(data.len());
        reply.data(&data[start..end]);
    }

    fn access(&mut self, _req: &Request<'_>, ino: u64, _mask: i32, reply: ReplyEmpty) {
        let inner = self.inner.lock().unwrap();
        if inner.ino_to_node.contains_key(&ino) {
            reply.ok();
        } else {
            reply.error(ENOENT);
        }
    }

    fn statfs(&mut self, _req: &Request<'_>, _ino: u64, reply: fuser::ReplyStatfs) {
        reply.statfs(0, 0, 0, 0, 0, 512, 255, 0);
    }
}

pub fn mount_archive(
    archive_path: &Path,
    mount_point:  &Path,
    password:     Option<&str>,
) -> io::Result<()> {
    let fs = ArchiveFilesystem::new(archive_path, password)?;
    fs.mount(mount_point)
}
