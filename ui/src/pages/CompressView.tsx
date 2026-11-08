import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CompressModal } from '../components/CompressModal'

export const CompressView: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedFiles: string[] = location.state?.selectedFiles || []
  const currentDir: string = location.state?.currentDir || ''

  return (
    <CompressModal
      isOpen={true}
      onClose={() => navigate(-1)}
      selectedFiles={selectedFiles}
      currentDir={currentDir}
      onSuccess={() => navigate(-1)}
    />
  )
}
