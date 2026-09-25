export async function removeUploadedFiles(files, removeFile) {
  await Promise.allSettled(files.filter(Boolean).map(file => removeFile(file.fileId || file.id)))
}

export async function uploadDocumentFiles({ workerId, files, uploadFile, removeFile }) {
  const uploaded = []
  try {
    for (const { side, file } of files) {
      const result = await uploadFile(workerId, file)
      uploaded.push({ side, fileId: result.id, fileName: result.original_name || file.name, fileType: result.content_type, fileSize: result.byte_size })
    }
    return uploaded
  } catch (error) {
    await removeUploadedFiles(uploaded, removeFile)
    throw error
  }
}
