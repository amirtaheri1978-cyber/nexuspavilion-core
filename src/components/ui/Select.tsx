type SelectOption = {
label: string;
value: string;
};

type SelectProps = {
value: string;
onChange: (value: string) => void;
options: SelectOption[];
placeholder?: string;
required?: boolean;
};

export default function Select({
value,
onChange,
options,
placeholder = "Select an option",
required = false,
}: SelectProps) {
return (
<select
required={required}
value={value}
onChange={(e) => onChange(e.target.value)}
className="rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-slate-900"
>
<option value="" disabled>
{placeholder}
</option>

{options.map((option) => (
<option
key={option.value}
value={option.value}
>
{option.label}
</option>
))}
</select>
);
} 