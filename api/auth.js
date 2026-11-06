import {handleVercelAuth} from '../server/vercel-auth.js';
import {nodeHandler} from '../server/vercel-http.js';
export default nodeHandler(handleVercelAuth);
