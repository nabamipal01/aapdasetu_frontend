const API_BASE_URL = import.meta.env.DEV

  ? "/AapdaSetu/backend"

  : import.meta.env.VITE_API_BASE_URL || "/AapdaSetu/backend";

 

export default API_BASE_URL;