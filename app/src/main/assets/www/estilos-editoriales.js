/*
  Estilo de cada editorial para los lomos y para las portadas que la app dibuja
  cuando un libro no tiene foto de portada.

  bg = color de fondo · fg = color del texto · ac = color de acento
  t  = plantilla: 'tipo' (tipográfica), 'bloque', 'franja', 'bandas', 'marco'
  f  = letra: 'serif' o 'sans'

  Son aproximaciones: desde Ajustes > Estilos de editorial puedes cambiar
  cualquiera, y lo que cambies allí tiene prioridad sobre esta lista.
  La clave es el nombre en minúsculas y sin acentos; basta con que aparezca
  dentro del nombre de la editorial ("Editorial Anagrama" -> anagrama).
*/
window.ESTILOS_EDITORIALES = {
  'anagrama':            { n: 'Anagrama',             bg: '#E8B92F', fg: '#1A1A1A', ac: '#1A1A1A', t: 'bloque', f: 'sans'  },
  'tusquets':            { n: 'Tusquets',             bg: '#F3EEE3', fg: '#1C1C1C', ac: '#B22B27', t: 'franja', f: 'serif' },
  'alfaguara':           { n: 'Alfaguara',            bg: '#FFFFFF', fg: '#151515', ac: '#D7262E', t: 'tipo',   f: 'serif' },
  'acantilado':          { n: 'Acantilado',           bg: '#EDE5D3', fg: '#3A2E22', ac: '#8A6E4B', t: 'tipo',   f: 'serif' },
  'seix barral':         { n: 'Seix Barral',          bg: '#1E2A44', fg: '#F4F1EA', ac: '#C9A45C', t: 'marco',  f: 'serif' },
  'salamandra':          { n: 'Salamandra',           bg: '#FFFFFF', fg: '#1A1A1A', ac: '#E2001A', t: 'franja', f: 'sans'  },
  'impedimenta':         { n: 'Impedimenta',          bg: '#F4EEDC', fg: '#2A1A14', ac: '#8C1C13', t: 'marco',  f: 'serif' },
  'asteroide':           { n: 'Libros del Asteroide', bg: '#F2EDE3', fg: '#23303A', ac: '#2F6B8A', t: 'franja', f: 'serif' },
  'sexto piso':          { n: 'Sexto Piso',           bg: '#FAFAFA', fg: '#111111', ac: '#111111', t: 'tipo',   f: 'sans'  },
  'siruela':             { n: 'Siruela',              bg: '#F5F1E8', fg: '#2B1B17', ac: '#6E1F1F', t: 'marco',  f: 'serif' },
  'lumen':               { n: 'Lumen',                bg: '#FFFFFF', fg: '#1A1A1A', ac: '#C8102E', t: 'tipo',   f: 'serif' },
  'penguin clasicos':    { n: 'Penguin Clásicos',     bg: '#141414', fg: '#FFFFFF', ac: '#F58220', t: 'bandas', f: 'sans'  },
  'penguin':             { n: 'Penguin',              bg: '#FFFFFF', fg: '#111111', ac: '#F58220', t: 'bandas', f: 'sans'  },
  'debolsillo':          { n: 'Debolsillo',           bg: '#FFFFFF', fg: '#111111', ac: '#111111', t: 'bloque', f: 'sans'  },
  'random house':        { n: 'Random House',         bg: '#FFFFFF', fg: '#111111', ac: '#111111', t: 'tipo',   f: 'sans'  },
  'alianza':             { n: 'Alianza Editorial',    bg: '#FFFFFF', fg: '#1A1A1A', ac: '#E30613', t: 'bloque', f: 'sans'  },
  'catedra':             { n: 'Cátedra',              bg: '#F2F2F2', fg: '#1F3B73', ac: '#1F3B73', t: 'bandas', f: 'serif' },
  'planeta':             { n: 'Planeta',              bg: '#FFFFFF', fg: '#0B1F3A', ac: '#0057A8', t: 'tipo',   f: 'sans'  },
  'destino':             { n: 'Destino',              bg: '#FFFFFF', fg: '#1A1A1A', ac: '#9B1B30', t: 'tipo',   f: 'serif' },
  'booket':              { n: 'Booket',               bg: '#FFFFFF', fg: '#111111', ac: '#E4032E', t: 'bloque', f: 'sans'  },
  'austral':             { n: 'Austral',              bg: '#FFFFFF', fg: '#13294B', ac: '#2CA8E0', t: 'bandas', f: 'sans'  },
  'nordica':             { n: 'Nórdica',              bg: '#F1EEE6', fg: '#1F2A22', ac: '#2C5530', t: 'tipo',   f: 'serif' },
  'periferica':          { n: 'Periférica',           bg: '#F7F3EA', fg: '#1E1E1E', ac: '#E2582F', t: 'franja', f: 'sans'  },
  'valdemar':            { n: 'Valdemar',             bg: '#121212', fg: '#EDE6D6', ac: '#B3121A', t: 'marco',  f: 'serif' },
  'minotauro':           { n: 'Minotauro',            bg: '#1B1B1B', fg: '#F2E9D8', ac: '#C8A24A', t: 'marco',  f: 'serif' },
  'blackie':             { n: 'Blackie Books',        bg: '#111111', fg: '#FFFFFF', ac: '#F4D03F', t: 'bloque', f: 'sans'  },
  'galaxia gutenberg':   { n: 'Galaxia Gutenberg',    bg: '#F4F1EA', fg: '#1A1A1A', ac: '#7A1E2B', t: 'tipo',   f: 'serif' },
  'reservoir':           { n: 'Reservoir Books',      bg: '#111111', fg: '#FFFFFF', ac: '#E10600', t: 'bloque', f: 'sans'  },
  'plaza janes':         { n: 'Plaza & Janés',        bg: '#FFFFFF', fg: '#111111', ac: '#00539F', t: 'tipo',   f: 'serif' },
  'ediciones b':         { n: 'Ediciones B',          bg: '#FFFFFF', fg: '#111111', ac: '#E30613', t: 'bloque', f: 'sans'  },
  'nova':                { n: 'Nova',                 bg: '#0E1A2B', fg: '#FFFFFF', ac: '#36B5E5', t: 'bloque', f: 'sans'  },
  'edhasa':              { n: 'Edhasa',               bg: '#F4EFE6', fg: '#1A1A1A', ac: '#8B2E1E', t: 'franja', f: 'serif' },
  'gatopardo':           { n: 'Gatopardo',            bg: '#F3EFE7', fg: '#1A1A1A', ac: '#C35A1F', t: 'tipo',   f: 'serif' },
  'pre textos':          { n: 'Pre-Textos',           bg: '#F5F2EA', fg: '#222222', ac: '#5A5A5A', t: 'tipo',   f: 'serif' },
  'navona':              { n: 'Navona',               bg: '#FFFFFF', fg: '#111111', ac: '#E85D2A', t: 'franja', f: 'sans'  },
  'roca':                { n: 'Roca Editorial',       bg: '#FFFFFF', fg: '#111111', ac: '#A6192E', t: 'tipo',   f: 'serif' },
  'umbriel':             { n: 'Umbriel',              bg: '#16161A', fg: '#F2F2F2', ac: '#8E44AD', t: 'marco',  f: 'serif' },
  'maeva':               { n: 'Maeva',                bg: '#FFFFFF', fg: '#1A1A1A', ac: '#D4145A', t: 'tipo',   f: 'serif' }
};
