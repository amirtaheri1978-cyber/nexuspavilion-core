type InputProps = {
type?: string;
placeholder: string;
value: string;
onChange: (value: string) => void;
required?: boolean;
};

export default function Input({
type = "text",
placeholder,
value,
onChange,
required = false,
}: InputProps) {
return (
<input
type={type}
required={required}
placeholder={placeholder}
value={value}
onChange={(e) => onChange(e.target.value)}
className="rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-slate-900"
/>
);
} 