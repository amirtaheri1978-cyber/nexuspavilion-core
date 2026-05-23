type ButtonProps = {
children: React.ReactNode;
type?: "button" | "submit";
disabled?: boolean;
onClick?: () => void;
};

export default function Button({
children,
type = "button",
disabled = false,
onClick,
}: ButtonProps) {
return (
<button
type={type}
disabled={disabled}
onClick={onClick}
className="
w-full
rounded-lg
bg-slate-900
px-5
py-3
text-sm
font-semibold
text-white
transition-all
hover:bg-slate-800
disabled:opacity-50
"
>
{children}
</button>
);
}