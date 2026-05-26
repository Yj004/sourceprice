/**
 * useProducts — hook split into its own file for Fast Refresh.
 */

import { useContext } from 'react';
import ProductContext from './ProductContext.jsx';

export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used inside <ProductProvider>.');
  return ctx;
};

export default useProducts;
