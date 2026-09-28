import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function DeleteFeedback({ warning, error }) {
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Before you delete</AlertTitle>
        <AlertDescription>{warning}</AlertDescription>
      </Alert>
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Deletion could not be completed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  )
}

export default DeleteFeedback
