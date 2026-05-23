type ErrorMessageProps = {
message?: string;
};

export default function ErrorMessage({ message }: ErrorMessageProps) {
if (!message) {
return null;
}

return (
<p className="mt-1 text-xs font-medium text-red-500">
{message}
</p>
);
}