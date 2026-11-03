"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { useMemo } from "react";

// Quill touches `document`, so load it on the client only. react-quill-new is the maintained fork of
// react-quill: the original calls ReactDOM.findDOMNode, which React 19 removed (the editor crashed on open).
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
      ],
    }),
    []
  );

  return (
    <div className="bg-background">
      <ReactQuill
        theme="snow"
        // Plain innerHTML, like the original react-quill (getSemanticHTML turns every space into &nbsp;).
        useSemanticHTML={false}
        value={value}
        onChange={onChange}
        modules={modules}
        className="min-h-[300px] border-border rounded-md"
      />
    </div>
  );
}
