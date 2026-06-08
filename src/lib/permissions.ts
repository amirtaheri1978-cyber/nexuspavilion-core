export type UserRole =
| "owner"
| "admin"
| "buyer"
| "vendor"
| null
| undefined;

export function canManageCompany(role: UserRole) {
return role === "owner" || role === "admin" || role === "buyer";
}

export function canInviteUsers(role: UserRole) {
return role === "owner" || role === "admin" || role === "buyer";
}

export function canManageMembers(role: UserRole) {
return role === "owner" || role === "admin";
}

export function canChangeRoles(role: UserRole) {
return role === "owner" || role === "admin";
}

export function canDeleteCompany(role: UserRole) {
return role === "owner" || role === "admin";
}

export function canTransferOwnership(role: UserRole) {
return role === "owner";
}

export function canViewGovernance(role: UserRole) {
return role === "owner" || role === "admin";
}