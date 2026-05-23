import { z } from "zod";

export const registerSchema = z.object({
legalName: z
.string()
.min(2, "Corporate legal name is required."),

taxId: z
.string()
.min(3, "Tax ID is required."),

email: z
.string()
.email("Invalid corporate email address."),

phoneNumber: z
.string()
.min(7, "Phone number is required."),

regionalHub: z
.string()
.min(2, "Regional hub is required."),

roleType: z
.string()
.min(2, "Role type is required."),

mainCategory: z
.string()
.min(2, "Primary category is required."),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>; 