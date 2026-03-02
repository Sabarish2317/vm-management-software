import React, { useRef, useState } from 'react'
import ButtonSm from './Buttons'

interface ReadFileData {
  fileName: string
  data?: string
  loadResult?: 'success' | 'danger'
  error?: string
}

interface MultiFileUploadProps {
  allowedTypes?: string[]
  simulateFailure?: boolean
}

const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
  ],
  simulateFailure = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileResults, setFileResults] = useState<ReadFileData[]>([])

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? [])
    const filtered = selectedFiles.filter((file) =>
      allowedTypes.includes(file.type)
    )

    const newFiles = filtered.filter(
      (file) => !files.some((f) => f.name === file.name)
    )
    setFiles((prev) => [...prev, ...newFiles])

    newFiles.forEach((file) => readFile(file))
    e.target.value = '' // Reset input
  }

  const readFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setFileResults((prev) => [
        ...prev,
        {
          fileName: file.name,
          data: reader.result as string,
          loadResult: simulateFailure ? 'danger' : 'success',
          error: simulateFailure ? 'Upload failed (simulated).' : undefined,
        },
      ])
    }
    reader.onerror = () => {
      setFileResults((prev) => [
        ...prev,
        {
          fileName: file.name,
          loadResult: 'danger',
          error: reader.error?.message ?? 'Unknown error',
        },
      ])
    }
    reader.readAsDataURL(file)
  }

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName))
    setFileResults((prev) => prev.filter((f) => f.fileName !== fileName))
  }

  return (
    <div className="grid w-full grid-cols-2 gap-6">
      {/* Left: Upload Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const droppedFiles = Array.from(e.dataTransfer.files)
          const filtered = droppedFiles.filter((file) =>
            allowedTypes.includes(file.type)
          )
          const newFiles = filtered.filter(
            (f) => !files.some((ff) => ff.name === f.name)
          )
          setFiles((prev) => [...prev, ...newFiles])
          newFiles.forEach((file) => readFile(file))
        }}
        className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500"
      >
        <p className="mb-2 text-lg font-medium">Upload Proofs</p>
        <p className="mb-4 text-sm text-slate-400">JPEG, PNG, PDF, DOC</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          className="hidden"
          onChange={handleFileSelection}
        />
      </div>

      {/* Right: Uploaded Files List */}
      <div className="w-full rounded-xl border border-[#F1F1F1] bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-slate-700">
          Uploaded Files ( Max : 7 files )
        </h3>
        {files.length === 0 ? (
          <p className="text-sm text-slate-400">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {files.map((file) => {
              const result = fileResults.find((r) => r.fileName === file.name)
              return (
                <li
                  key={file.name}
                  className="flex items-center justify-between rounded-md border-1 border-slate-300/50 bg-white p-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {file.name}
                    </p>
                    <p
                      className={`text-xs ${
                        result?.loadResult === 'danger'
                          ? 'text-red-500'
                          : 'text-green-600'
                      }`}
                    >
                      {result?.loadResult === 'success'
                        ? 'Uploaded successfully'
                        : result?.error || 'Uploading...'}
                    </p>
                  </div>
                  <ButtonSm
                    state="default"
                    text="Remove"
                    className="self-end bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300"
                    onClick={() => removeFile(file.name)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default MultiFileUpload
