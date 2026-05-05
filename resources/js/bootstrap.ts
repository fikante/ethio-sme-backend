import axios from 'axios';

// Basic axios setup for Inertia requests and API calls.
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const token = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');

if (token) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
}

export { axios };
