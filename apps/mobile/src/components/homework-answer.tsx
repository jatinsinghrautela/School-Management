import React, { useState } from "react";
import { useMobile } from "../provider";
import { Form } from "./workflow";
import { Upload } from "./upload";
import { Copy } from "./ui";
export function HomeworkAnswer({ resourceId }: { resourceId: string }) {
  const { session } = useMobile();
  const [attachmentId, setAttachmentId] = useState("");
  return (
    <>
      <Copy muted>
        You can submit a written answer with an optional PDF or image. Reviewed
        work must be reopened by your teacher before resubmission.
      </Copy>
      <Upload
        path={`/homework/${encodeURIComponent(resourceId)}/attachment`}
        title="Attach to this homework"
        fields={[]}
        uploaded={(result) =>
          setAttachmentId((result as { attachmentId: string }).attachmentId)
        }
      />
      <Form
        title="Submit your answer"
        fields={[
          { key: "answer", label: "Your answer (up to 10000 characters)" },
        ]}
        submit={(data) =>
          session.school(`/homework/${encodeURIComponent(resourceId)}/submit`, {
            ...data,
            attachmentId: attachmentId || null,
          })
        }
      />
    </>
  );
}
