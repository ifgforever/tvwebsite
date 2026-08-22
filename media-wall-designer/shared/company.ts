/**
 * Company details.
 *
 * Single source of truth for everything that prints on a customer-facing
 * document or a construction sheet. Change it here and it changes on the
 * proposal header, the plan-set title block and the signature line.
 *
 * Values taken from the LocalBusiness schema published on the website.
 */
export const COMPANY = {
  name: 'TV Install Chicago',
  /** Uppercase form used on the proposal header and plan title block. */
  nameDisplay: 'TV INSTALL CHICAGO',
  tagline: 'Custom media walls',
  domain: 'tvserviceschicago.com',
  website: 'https://tvserviceschicago.com',
  /** Swap this the day a domain mailbox exists — nothing else needs touching. */
  email: 'tvinstallchicago@gmail.com',
  phone: '(630) 592-2982',
  phoneHref: '+16305922982',
  city: 'Chicago, IL',
  /** Printed under the company name in the plan-set title block. */
  planSubtitle: 'CUSTOM MEDIA WALLS · CHICAGO, IL',
} as const;

/** One line for a document header: "Custom media walls · tvserviceschicago.com · (630) 592-2982" */
export const companyContactLine = () =>
  [COMPANY.tagline, COMPANY.domain, COMPANY.phone].join(' · ');
