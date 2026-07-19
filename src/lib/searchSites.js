// Search sites for looking up highlighted text.
// Each site has a `search(text)` function that returns { url, needsPaste }.
// If needsPaste is true, the UI tells the user their text was copied to clipboard
// and they should paste it into the site's search box.

export const SEARCH_SITES = [
  {
    id: 'openevidence',
    name: 'OpenEvidence',
    color: '#0891b2',
    description: 'Evidence-based clinical Q&A',
    search: (text) => ({
      url: `https://www.openevidence.com/search?q=${encodeURIComponent(text)}`,
      needsPaste: false,
    }),
  },
  {
    id: 'doxgpt',
    name: 'DoxGPT',
    color: '#7c3aed',
    description: 'Medical AI assistant',
    search: (text) => ({
      // DoxGPT doesn't publish a query-string search; open the home page with text copied.
      url: 'https://doxgpt.com',
      needsPaste: true,
    }),
  },
  {
    id: 'uptodate',
    name: 'UpToDate',
    color: '#d97706',
    description: 'Clinical decision support (login required)',
    search: (text) => ({
      url: `https://www.uptodate.com/contents/search?search=${encodeURIComponent(text)}`,
      needsPaste: false,
    }),
  },
  {
    id: 'dynamedex',
    name: 'DynaMedex',
    color: '#059669',
    description: 'Point-of-care reference (login required)',
    search: (text) => ({
      // DynaMedex requires institutional login; opening the home page with text
      // copied is the most reliable behavior across auth states.
      url: 'https://www.dynamedex.com',
      needsPaste: true,
    }),
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    color: '#2563eb',
    description: 'Primary literature search',
    search: (text) => ({
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(text)}`,
      needsPaste: false,
    }),
  },
  {
    id: 'google-scholar',
    name: 'Google Scholar',
    color: '#4285f4',
    description: 'Academic literature',
    search: (text) => ({
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(text)}`,
      needsPaste: false,
    }),
  },
];

// Copy text to clipboard, open the site in a new tab.
export async function searchWith(site, text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // Older browsers or insecure contexts — fall back silently
    console.warn('Clipboard write failed', e);
  }
  const { url } = site.search(text);
  window.open(url, '_blank', 'noopener,noreferrer');
}
