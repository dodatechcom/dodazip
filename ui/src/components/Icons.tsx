import React from 'react'

interface IconProps { size?: number }

/* ─── Toolbar Icons (colorful, refined palette) ─── */

export const IconNew: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="#3b82f6" fillOpacity="0.12" stroke="#3b82f6" strokeWidth="1.5"/>
    <path d="M15 2v6h6" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M10 9v6M7 12h6" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconOpen: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20V8a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#d97706" fillOpacity="0.12" stroke="#d97706" strokeWidth="1.5"/>
    <path d="M3 18l2-9h16l-2 9H3z" fill="#d97706" fillOpacity="0.12" stroke="#d97706" strokeWidth="1.5"/>
  </svg>
)

export const IconExtract: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" fill="#059669" fillOpacity="0.12" stroke="#059669" strokeWidth="1.5"/>
    <path d="M12 8v8M8 12l4 4 4-4" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconAdd: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" fill="#e11d48" fillOpacity="0.12" stroke="#e11d48" strokeWidth="1.5"/>
    <path d="M12 16V8M8 12l4-4 4 4" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 18h16" stroke="#e11d48" strokeWidth="1.5" strokeOpacity="0.3"/>
  </svg>
)

/* ─── Navigation Icons (monochrome) ─── */

export const IconFolder: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20V7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#f59e0b" fillOpacity="0.18" stroke="#f59e0b" strokeWidth="1.5"/>
  </svg>
)

export const IconUp: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconBack: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── Search / Filter (monochrome) ─── */

export const IconSearch: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M16.5 16.5L22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconClear: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

/* ─── Status Icons (monochrome) ─── */

export const IconCheck: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconX: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconLoader: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconEmptyFolder: React.FC<IconProps> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20V7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
    <line x1="8" y1="16" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
  </svg>
)

/* ─── Theme (monochrome) ─── */

export const IconSun: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconMoon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── Sort (monochrome) ─── */

export const IconSortAsc: React.FC<IconProps> = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M8 9l4-4 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconSortDesc: React.FC<IconProps> = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 19V5M8 15l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── File Type Icons (subtle color differentiation) ─── */

export const IconFileGeneric: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
)

const DZIP_ICON_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAioElEQVR4nOWbCZgW1Znvf6eqvn3pvRtomh0JqIAKCOICosZ9IcE16qhZzDIzmWhuRs0VMTEm0RlNMpPMeHXGqDEKWd13FhFFAQFpdpq96W56/9ZazzznVBO9yQCazDz3ufdWP9VfdVV91ee8513+7/99C/4/38RR75BSnLEEs34WcgLIjSAWqfP61x9tzcgjPmvBXR9/ZPOODce26HKf/1PbfCmNT3K/GrExsIuPs//xiYEvq/MfXZl5Cxea//Wz+3DM//kmpUAIefKmnhGZdObqvvZgjFP2TccH2wfHA0cKAj1i8J1AWo6MRQRR30PigfTB9yHwJL4bID2fwPUHzvugz6sbfHBdsD0Cx8HMe5jdB1srhPVq2+/OeF4IEcxbKM1Fl4tAjYz/bgHMl9JYIEQwfU3/GVZN6qm9u4xBnZ0gXZCeJFADVRNRu5KE64HtIksO2DZ4SkIu0lPX7PC6+nTK4Lt6stJ39LHwHPBK4BTBt5Ukkb6NMAzMks0JM09568zLr/z2Dy4SS4QQ3HlnYCxYoAXx3yUAoVWw9idt6UEzKtbubImNzu/qdbCkqSfmDuxqBfXE1B5OSh974bHwBwTghMd45VAI+rwSkoNQqqDOH9p99akE4CACR0qvZERtz7j6W/dIUTXq+//++QvvhqXlAW34L/ENxp+cWfi0KaUkaxandHaI0fnWvkAkRVQIaQpDmIYhTNOQerf0HuhP/beFaZmYhiFNIQxTCGEKAxNDmBiGaVqYhhneY1nSNM3ANPX9hPeh9sAUSBMpLSuaMpz+Hn/vey9w4qfSt839/mNvzPz6ymPV5JUQPpYT/8QCGNgCL0h7diAJAiEcpe6BtlHpOPgF8HvB6/TxOny8gz5+j8TrlHg9BkEpqm1ZBh6mkBjCQ/oSr5jAL8XxcjG8XhNPfafPw8+7BEUb6SjNsBGyhImNERSxElHzwO7t4lO1jnfKpIYZTcOHL572t+uuUkKYP18K5s//RI76jzfrcBd8ifoR+IFUB0q9pe2BbzCtoY1j0iWqKlwGVbvUJ/uJGnk6eiWtex22b5G80zWBzu5+vFwZRJRM2uGHl/2eIak8rT1V7O+N0toVpa0ryoFu6Ojx6e71cXIBfikgsB21ClByaG3voT7pWycON30ZJOsQg540btkyccECcbt2ivMWmn9uuLSOdFF5b7XqQq2iWlEvzpXJRXxp3Xco2ZKKmgxmLEvNyCE0jY4TyRZ4cuVbdOwcwafHXkxm0igKmGzZuINZ2Ve42XyD/jxEkxCvBxIRAjOBL5J4MkmvHaWjnOBALk17d5oDPUl27pBs218kbTlUDqowHc+XhhELrEjD3wdfb56wu3n1F9oXXd7BPGmy6JP7BetPzhwCOB4EOua5KDSgPLy0DWa1/5L8+nZ2e9BX7GDcWUOoG9lAOZ2kVExy9qWXUH0gwa+XbaRn8w4mHjuUaVMCTo41sbH7PA5uehkHg2I5wFdhBZeI1U88BqkkJJMwJmNwXGIE0VFDyNcEPLPKIypd6irAdixhGIYppO0ZovFiXxqjKmrfmrf1l2LzvHnSXPQJhWAd9op6jLJ7pfpSYno+Jw5pp6G/lsrhlfgCzptXy4gpKuS9D0QhkoFImnNPSnHuRbX89a0tvLshxdQpk3j0QCXvvt3GhNgJzL/ZpHHMcRS7XNyCTTFnY+fyFPLquEx3rkipM0LRhq6egM0dKni4RA1JXcbQ2MMPsJRNCjnouE1m9PVRV715xaJfiuVnnLHYWrp0tvcXC8D3PXxP6jgtizG+eeyvuWf6L/Gt4XjeuZjpJNGUh99fQhgqpJXALYBbxuvvIJJp45brElz6N2+yu2UDV171OSZ87gpeXLyOH/78CX52XzeRkUMRVjIUnFELRiXIFPgxsA28YkCxs5fq51ZiF/sQDCZhuFTFDexKZZ2W5fiO7/mZIZ5f/+Lwz7x+/dJfz/7NJzEH63AXPE+BHOX5HSgEHGuuwji4Ad9oI5GykDKN71Qj4lmElQVrCJhJMCwsFVxkkVrjNR6491u8tLbA//i7ryANg23bv8Opkx6gZfmdjJy0hSBeCZYJkYTWHrVLK4lIRzEzEbLJbk4auZE1v7+f+hEPU5mIUx+HbAVUVKs9aVZUESRSyfRaM/a0N/eVG/cvEo+jwuTHwArWYa9oUCYRpTKy36PgxJGJJDJIEggDIQWG3w+2WvVOPXFMBeKjSCOBMBN077YJaipY897LbNh8IUVH8sZrzzL1pNvoj56IzDgQjSCkAwrcKWfjCURgawFK6UHuIFUZH958hB99voW6ky7GiqdwfINe26LoW5RFyjCM2mD0oAYzlpz079m6bfamy8XC+fPlUVGjdfhLpsbuGr4WSxrVqWgAAcIwwRBgGGBEwYghDQshBrIZBXOlR6E/j512OeWM83j2lZW8v249U0+ZzfCGeuxduzGGT8fr9THMmEY0UiN9FxGUkEEJvDwIi0yNwdQTIxjvLmbdk4vZ2ws5B5q7oK2oEEOSkllrxJKZoHbMVKNq8nX/durdcseCO8Vq5kuDIwjBOpJ0FHgRvoK6Dq4XDOCuUAj6U2FmjRKUpokwqVGaINU9BhXZgOaVb7DbGcFN11xKb08nO/fuZcuqpRyXbYPSXkSpFI5CqF/KdNSuAIih8zHSQzBqLAYPWsHsWVEmjof2DkmxLFi6u4oVmwN6giTr+7PYvjT2r33db2/ZnGo8468fXCzl7NnKnS84/ByNw13wiwr9SeUMNIYvq4ilJqZyAD1BGWpImO4hFGhRQlECCxSQsWlorGDLyt/guzYzTz6e8eNGsHdVSt579l8ZNTwD5QACJWShcwjlcIVXAKcPygfBbkc4+3ACSe9Bk3TWo2GQz+hhHpPGSsYONhifDWhMmUgjiUjWYNQfa3rCkK1rXjj1S3+14WQlSg2U/hwNIFADVAmLjW0PyEqtuK8mbCKEGea8wUAC7wdIBdH9QPsIXxa48aa5bEnOZseO3VimwXHHTqYh9wG1NVmCYgFDJUZBOD4pA5WKIQMZKpgannqOF9DeKkinVVohiccFURMyCUFTxiJvRyBaiYinkaZyoE2+L9JWy9svThTCeAuahVyMxRICsUCr78cTgPSC0AR8D8cdEEYQINQAfQMpBMIQCKUFSgI60VcOTGWUgnKxzORTP8N3vvlzbrzqVzQ2DuYXv3qB5kffw+5rJZrKhP5C66Khn6swR5jxm0iUs3UIinm6OhyG1oCZUv9XZVMhg5KJGcRIQLQqFICVASsupFHHmIptIzZtCVJTVt/liCkL3IH1M4SiMT6WAPyQxAgFIP9g+mqQQgtCCcXVHjwcuBKGAk7KHyhwEyORGc9tt36Z48Y1kevroa6uhv3tDm6uTMx3NObXzJB6tNYoNWmluEUCr0h/KYtdeQWRuePZuPF/MaZvGVFcgqyFNBNYcTBkBpEaAokEmHEsU5huIcq1Zzd9g/dPuX65k26x1g9a3LPKe1SIzm0fFYJ1ZBPQs9UrG2qAmrjSCLVAZpj7q1U3I+GnUl8/9BPS7sVlOAEZegv7uPKKazjpxGNpaS9S9izs/hJpBbIUgWKEqi2CnDawkmNREKMop88jGH4JtYPHUihtZPPQ77HX20ZD+zN8qvwuTn8Zz69ExoYiaydDwgiJFlmGfJnY8MssJn29IfrmHQ1G7qczqidHb849FvmqEO5Tcj6GMocjIEEVkXyEH6r+IQGEQhCa6MBSsVutmgxDoPpTJVDKd+ZyxGtPYuXGvdx2z8Mc01hLZSbOHXd/Gymi2PmSxhDCVZpUouBlyIvRGJWnkhw1h6ra6ezv9Fi+YhVPvLqYlZvaOHFIhIkTx5Otv411UYfiCS1U9u7D7h0DiVkEdgn27UH2bgdL4CuCxYhJb8b9Ujz3oh8Zuq062WA8mns0tVH8VWG9EsLhNcALiT3tAwIfz1MgJXR0YdRTaq5mPKApWofDY+UA3ZxP8rhpbFndzqWfnsE9d3yZxvFnc9mWnUQTaexcoDFGqdemJf1NMqMuIVvVhBlNsWVfD88//za/XbGb9/sqIHsy1B3k9Z0fsKLlfUbVNtM0bhJDJp9PzSmVTB4G12fgJx/A754E4XSC6YEyKQIhZFlYQ+oMv7zHNdNuLBKRlwLrmXUkASgNUL8UneW7uI5S7QChaC/z0GQFWAr4DEQBZVXKcQqJVxb46eNZu345nW37uee+h6hMRohYUUquRC2WgputOwsUp57Dgb4aHn9pK2tLcTbttvGDRqgbDxU25HqoipbpMSOUgjqaD5ZpPtBMal0H9ROmMO2y8Vw9x2BUgwmxGIYVA8tSZEYY6XuWIOMOOKbALSlXY328bDDwEMrOfQenrAiKgdVWE9YSUqDlEL8dTj68p4xrVdNhN3DatIm88moPK95Zx4033UBXTx8qxVCPVb9KeZ/BVfDmur080ZKBCWNB+ERKRbz2TsZXuvz05pEMr2xid+tkvvbD12jeXsZMpSk4sHNjF510MX5MA2+8WYC2TrD7MJUfMLIQ7Ebar4OwEcU+AxERTmC9qbH+T5FHdoJK/VWc9m08xQ2oSKB2M0R6fwA+WgCHooSCyIJCv83G5q1Mnnoy06ZOob2zly1bW+jrLxBLpLULUWbmu5KoFaEqLTEdgdGpssl+vGKJpFfi6ZtH8vbilXz14WXceOWJPHLn+Zx5w6OU7BKG8r1eB5lOwf7NdfQ3t2B07wTLx89bGPYGEK3g7YeuDzwjHbXcg8brL159/hty/iLlBP0j+AC1worDD5lcXy2bCtnKGRqhOUhT5QLKAQ6YwABKVopRHcuz/+fX8auHT8LJNjBs+GgGNY6gJ1ega/saMuOEJluMwKe/6FAsuPi9ZUinEpFMIZKJ8J7A93wK+SJDh49k+MjRzH1jG5s3bufe793I0GHDR1qWpdtV1k55f/5Llysh+J+N3U90Ufl4dO/r19d2Uf9L7+s9Usp5o/5i/uRfv/a3E2pG1K5f+o/PLvF7ejnupFGMqK/j5XUbmfb5LzGsoY41S19j52tv4u7ag7djJy0fbmPvGxtwN20l6OqjZ08vV4y5gJd2rWTkxFq0ZJdKpbj40t/wZk2O4yZNYeKUiQypHsKOnV3s37+ffXv3E4yqZ0xNAz/+wW08/PA9fPjBhyxf/g5nnnU2EydNoH1/B4219Vx8yQXctfhZ9m7Zwr6PP8A6eC8X3/w0e4qW0k7t5bXk82qf95H3Z8z44Wuv/8/f03t73mP46PGMHzeWDevXU1NdTUVFhW591eR1d+eZcOzxNDU1Mm/eT7jmu1/D6u3lxu98hzsfvp8b/uUaHvnpA7w772kOPf00J5x0Ml2lIpnKLD25PJZpYdsWfquH3VdE/k01P3jh71c++s17K0fUDGXVyuV8/rnT2PLB+0yfMYNf/ew5Zky7iM7dO3j22Zf4wSOPc8ed9zJt+vGcfsoMnvjFE9x67118/4Ffc831V3L9jdfR1d2FbZsc6OmipjJLY329Hh345z12k/kPj9fT1bVbT/6pp57k058+jTffWM3EiRP05Ddv3sLEiRPo7e1h3LjxvP3WG1xx5Xf40aN/4Ppvf4f7f/YwNz32E2758V18856b+eGjv+T6G/6Fa677Fi0t+1i37k0mT55MoVAgnYozZ+bFnDHj85w743OMmjyZl19eRv9ggYsvvoyHHvo5c+ZcTntHB2NGjmT+/HmsWPEOs2bNoiKToa+vnx07drBlyxb9+bZt23jqqad4+OGHefTRR3nqqad49dXX9PfWr1/Pu+++y/r16/XnrVu3smPHDnbs2MHu3bv15z/84Q954okn9OdPPfUUTz75JE8++STPPfccjzzyMI888jC//vWv+dWvfsWvf/1r7r//fh5//HEeffRRHnnkER555BEef/xx/vVf/1Wf7969my1btui6wYYNG/R569atbNmyhc2bN/Phhx/y7rvvsmzZMnbu3MmGDRvYsWMHW7du1ec7d+5kx44d+vPOzs6w5+9A/w8z0f4/KxH6t4/qK8EAAAAASUVORK5CYII='

export const IconDzip: React.FC<IconProps> = ({ size = 16 }) => (
  <img
    src={DZIP_ICON_DATA_URL}
    width={size}
    height={size}
    alt="DodaZip"
    style={{
      verticalAlign: 'middle',
      objectFit: 'contain',
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
)

export const IconWarningRisk: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3L2 21h20L12 3z" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 9v5M12 17.5h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconShieldOk: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 5v6.5C4 16.5 7.5 21 12 22c4.5-1 8-5.5 8-10.5V5l-8-3z" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M9 11.5l2 2 4-4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconZip: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#0891b2" fillOpacity="0.12" stroke="#0891b2" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#0891b2" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M8 12h.01M10 14h.01M8 16h.01M10 18h.01" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconSevenZ: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M9 12h6l-4 5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="9" y1="17" x2="15" y2="17" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconRar: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#ea580c" fillOpacity="0.12" stroke="#ea580c" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#ea580c" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M12 12v6" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 12h2a2 2 0 0 1 0 4h-2" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconTar: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 4h16v16H4V4z" fill="#78716c" fillOpacity="0.12" stroke="#78716c" strokeWidth="1.5"/>
    <path d="M4 8h16" stroke="#78716c" strokeWidth="1.5" strokeOpacity="0.25"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="16" x2="14" y2="16" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
)

export const IconBookmark: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4.5L4 21V4a1 1 0 0 1 1-1z" fill="#d97706" fillOpacity="0.15" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
)

export const IconDuplicate: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="8" y="8" width="14" height="14" rx="2" fill="#8b5cf6" fillOpacity="0.12" stroke="#8b5cf6" strokeWidth="1.5"/>
    <rect x="2" y="2" width="14" height="14" rx="2" fill="#8b5cf6" fillOpacity="0.08" stroke="#8b5cf6" strokeWidth="1.5"/>
  </svg>
)

export const IconPortable: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.5" fill="none"/>
    <path d="M12 7v5l3 3" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconVolume: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="#f59e0b" strokeWidth="1.5" fill="none"/>
    <path d="M8 12h8M12 8v8" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconCompressed: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#dc2626" fillOpacity="0.10" stroke="#dc2626" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.4"/>
    <path d="M8 14l4-4 4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="10" x2="12" y2="18" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconRename: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconTrash: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

export const IconShred: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.6"/>
    <line x1="12" y1="15" x2="12" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconSettings: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const IconGlobe: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

export const IconDisc: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="#0284c7" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" stroke="#0284c7" strokeWidth="1.6" />
    <path d="M12 3v2M12 19v2" stroke="#0284c7" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5" />
  </svg>
)

export const IconPackage: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M16.5 9.4L7.55 4.24a1.78 1.78 0 0 0-1.8 0L2.8 5.94a1.8 1.8 0 0 0-.9 1.56v7a1.8 1.8 0 0 0 .9 1.56l2.95 1.7a1.78 1.78 0 0 0 1.8 0l8.95-5.16a1.8 1.8 0 0 0 .9-1.56v-7a1.8 1.8 0 0 0-.9-1.56z" fill="#059669" fillOpacity="0.12" stroke="#059669" strokeWidth="1.5"/>
    <path d="M2.3 6.8l9.7 5.6 9.7-5.6M12 12.4v9.6" stroke="#059669" strokeWidth="1.5"/>
  </svg>
)

export const IconRefresh: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
)

export const IconHelp: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export const IconSpeed: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="M20 12h2" />
    <path d="m19.07 4.93-1.41 1.41" />
    <path d="M15.93 15.93 12 12" />
    <circle cx="12" cy="12" r="8" />
  </svg>
)

export const IconCpu: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
  </svg>
)

export const FileRowIcon: React.FC<{ name: string; isDir: boolean }> = ({ name, isDir }) => {
  if (isDir) return <IconFolder size={16} />
  const lower = name.toLowerCase()
  if (lower.endsWith('.dzip')) return <IconDzip size={16} />
  if (lower.endsWith('.zip')) return <IconZip size={16} />
  if (lower.endsWith('.7z')) return <IconSevenZ size={16} />
  if (lower.endsWith('.rar')) return <IconRar size={16} />
  if (lower.endsWith('.tar') || lower.endsWith('.tgz') || lower.endsWith('.tbz2') || lower.endsWith('.txz') ||
      lower.endsWith('.tar.gz') || lower.endsWith('.tar.bz2') || lower.endsWith('.tar.xz')) return <IconTar size={16} />
  if (lower.endsWith('.iso')) return <IconDisc size={16} />
  if (lower.endsWith('.dmg')) return <IconDisc size={16} />
  if (lower.endsWith('.deb') || lower.endsWith('.ar') || lower.endsWith('.a')) return <IconPackage size={16} />
  if (lower.endsWith('.cab')) return <IconCompressed size={16} />
  if (lower.endsWith('.gz') || lower.endsWith('.bz2') || lower.endsWith('.xz')) return <IconCompressed size={16} />
  return <IconFileGeneric size={16} />
}
