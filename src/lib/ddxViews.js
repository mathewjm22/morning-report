// DDx view modes and their category structures.

export const DDX_VIEWS = {
  list: {
    id: 'list',
    label: 'List',
    description: 'Flat ranked list',
    categories: null, // no categories in list mode
  },
  anatomic: {
    id: 'anatomic',
    label: 'Anatomic',
    description: 'Grouped by anatomical structure',
    categories: [
      { id: 'skin',       label: 'Skin & Superficial',   short: 'Skin' },
      { id: 'muscle',     label: 'Muscle & Wall',        short: 'Muscle' },
      { id: 'nerve',      label: 'Nerve',                short: 'Nerve' },
      { id: 'vessel',     label: 'Vessel',               short: 'Vessel' },
      { id: 'organ-upper',label: 'Organ (upper)',        short: 'Upper organ' },
      { id: 'organ-lower',label: 'Organ (lower)',        short: 'Lower organ' },
      { id: 'bone-joint', label: 'Bone / Joint',         short: 'Bone/Joint' },
      { id: 'systemic',   label: 'Systemic / Referred',  short: 'Systemic' },
    ],
  },
  vindicate: {
    id: 'vindicate',
    label: 'VINDICATE',
    description: 'By mechanism / category mnemonic',
    categories: [
      { id: 'vascular',      label: 'Vascular',                  letter: 'V' },
      { id: 'infectious',    label: 'Infectious / Inflammatory', letter: 'I' },
      { id: 'neoplastic',    label: 'Neoplastic',                letter: 'N' },
      { id: 'degenerative',  label: 'Degenerative / Drugs',      letter: 'D' },
      { id: 'iatrogenic',    label: 'Iatrogenic / Idiopathic',   letter: 'I' },
      { id: 'congenital',    label: 'Congenital',                letter: 'C' },
      { id: 'autoimmune',    label: 'Autoimmune / Allergic',     letter: 'A' },
      { id: 'traumatic',     label: 'Traumatic / Toxic',         letter: 'T' },
      { id: 'endocrine',     label: 'Endocrine / Environmental', letter: 'E' },
    ],
  },
};