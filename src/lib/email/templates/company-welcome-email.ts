export function companyWelcomeEmail({
companyName,
workspaceUrl,
}: {
companyName: string;
workspaceUrl: string;
}) {
return `
<div style="font-family:Arial,sans-serif;padding:24px;">
<h1>Welcome to Nexus Pavilion</h1>

<p>
Your company workspace has been successfully created.
</p>

<p>
<strong>${companyName}</strong>
</p>

<p>
Next steps:
</p>

<ul>
<li>Complete company profile</li>
<li>Invite team members</li>
<li>Create your first RFQ</li>
<li>Explore supplier marketplace</li>
</ul>

<a
href="${workspaceUrl}"
style="
display:inline-block;
background:#111827;
color:white;
padding:12px 20px;
border-radius:8px;
text-decoration:none;"
>
Open Workspace
</a>
</div>
`;
}