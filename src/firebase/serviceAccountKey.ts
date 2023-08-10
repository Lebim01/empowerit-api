/* eslint-disable prettier/prettier */
export default process.env.NODE_ENV == 'production' || true
  ? {
      apiKey: 'AIzaSyAqnTMbaCfibt13K7Y2K-NfrlmHBPkc-is',
      authDomain: 'topx-academy.firebaseapp.com',
      projectId: 'topx-academy',
      storageBucket: 'topx-academy.appspot.com',
      messagingSenderId: '466501641071',
      appId: '1:466501641071:web:14994360065a36ec167e9a',
      measurementId: 'G-B5N0GBM6RZ',
    }
  : {
      apiKey: 'AIzaSyCzQcrSP9lW6eYmmEkJ-5SxCfdK6YJMh6o',
      authDomain: 'topx-academy-dev.firebaseapp.com',
      projectId: 'topx-academy-dev',
      storageBucket: 'topx-academy-dev.appspot.com',
      messagingSenderId: '868581806255',
      appId: '1:868581806255:web:9fa8edab2a5580332ec45a',
    };
