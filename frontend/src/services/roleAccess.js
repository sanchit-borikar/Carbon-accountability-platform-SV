export const ROLES = {
  PUBLIC:    "public",
  REGULATOR: "regulator",
  COMPANY:   "company",
};

export const ACCESS = {
  overview: {
    public:    false,
    regulator: true,
    company:   true,
  },
  liveMap: {
    public:    "view",
    regulator: "full",
    company:   "own",
  },
  profiles: {
    public:    "view",
    regulator: "full",
    company:   "own",
  },
  dataVerify: {
    public:    false,
    regulator: "full",
    company:   "own",
  },
  alerts: {
    public:    false,
    regulator: "full",
    company:   "received",
  },
  myCompany: {
    public:    false,
    regulator: false,
    company:   true,
  },
  analytics: {
    public:    "aggregate",
    regulator: "full",
    company:   "own",
  },
  settings: {
    public:    false,
    regulator: true,
    company:   true,
  },
};

export function canAccess(role, page) {
  const access = ACCESS[page]?.[role];
  return access !== false && access !== undefined;
}

export function getAccessLevel(role, page) {
  return ACCESS[page]?.[role] || false;
}

export function filterByRole(data, role, companyCity = null) {
  if (role === ROLES.REGULATOR) return data;
  if (role === ROLES.COMPANY && companyCity) {
    return data.filter(d =>
      d.city === companyCity ||
      d.name === companyCity ||
      d.entity === companyCity
    );
  }
  return data;
}

export function getApiParams(role, companyCity = null) {
  if (role === ROLES.COMPANY && companyCity) {
    return { city: companyCity };
  }
  return {};
}
