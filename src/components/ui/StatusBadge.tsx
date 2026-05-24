type StatusBadgeProps = {
status: "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";
};

export default function StatusBadge({ status }: StatusBadgeProps) {
const labelMap = {
SANDBOX: "Sandbox Mode",
PENDING: "Pending Review",
APPROVED: "Approved",
REJECTED: "Rejected",
};

return (
<span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
{labelMap[status]}
</span>
);
}