import React from "react";
import ErrorMessage from "@/components/ui/ErrorMessage";

type FormInputProps = {
type?: string;
placeholder: string;
error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function FormInput({
type = "text",
placeholder,
error,
...props
}: FormInputProps) {
return (
<div>
<input
type={type}
placeholder={placeholder}
{...props}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

<ErrorMessage message={error} />
</div>
);
}