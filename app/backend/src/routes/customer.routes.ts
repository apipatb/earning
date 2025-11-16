import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDetails,
  getTopCustomers,
} from '../controllers/customer.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllCustomers);
router.get('/top', getTopCustomers);
router.get('/:id', getCustomerDetails);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
