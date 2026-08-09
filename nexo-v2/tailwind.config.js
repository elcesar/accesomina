/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Fondos
        bg:      '#F4EFE3',   // fondo de página
        surface: '#FFFFFF',   // tarjetas y paneles
        'surface-2': '#FBF9F5', // zebra de tabla, secciones alternas
        line:    '#E3DED2',   // bordes y separadores

        // Texto
        ink:     '#141A20',   // texto principal
        muted:   '#5D6B7A',   // texto secundario
        subtle:  '#8A96A1',   // placeholders, inactivos

        // Marca
        primary: {
          DEFAULT: '#2A2A8C',
          deep:    '#1A1A5E', // hover / presionado
        },
        graphite: '#26313A',  // encabezados tabla, segundo nivel

        // Acento
        accent: {
          DEFAULT: '#00CFC1',
          txt:     '#00706A', // turquesa como texto o icono
          dark:    '#08302F', // texto sobre turquesa
        },

        // Estados semánticos
        ok:   '#1B7F4B',   // vigente
        warn: '#C77700',   // por vencer
        err:  '#B3261E',   // vencido / no habilitado

        // Alerta
        coral: {
          DEFAULT: '#FF5A3C',
          txt:     '#B03510',
        },

        // Neutro
        metal: '#C7D0D6',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        chip: '9px',
      },
    },
  },
  plugins: [],
}
