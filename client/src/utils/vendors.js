// Vendors are typed by name on the entry forms. The server reuses a vendor with
// the same name (ignoring case and extra spaces) and otherwise creates one; this
// mirrors that match so the forms can tell a known vendor from a new one.
const normalize = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const findVendorByName = (vendors, name) =>
  name.trim() ? vendors.find((v) => normalize(v.name) === normalize(name)) : undefined;
