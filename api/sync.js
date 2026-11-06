import {handleVercelSync} from '../server/vercel-sync.js';
import {nodeHandler} from '../server/vercel-http.js';
export default nodeHandler(handleVercelSync);
