import React from 'react'
import { FiShoppingBag, FiImage } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import usePortalTabs from '../../hooks/usePortalTabs'
import { Notice, TabPanel } from '../../components/admin/AdminKit'
import { useNotice } from '../../components/admin/adminUtils'
import ProductsTab from './pta/ProductsTab'
import BannersTab from './pta/BannersTab'
import '../../styles/PageContent.css'
import SectionNav from '../../components/admin/SectionNav'


export default function PtaShop() {
  const session = useAdminPortal('PTA Shop', null)
  const [tab, , direction, sectionNav] = usePortalTabs('adminPtaTab', [{ id: 'products', label: 'Products', icon: FiShoppingBag }, { id: 'banners', label: 'Banners', icon: FiImage }])
  const [notice, notify, clearNotice] = useNotice()

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="ak-sr-only">PTA Shop</h1>
        <p>Items for sale in the PTA shop, their suppliers and paperwork, and the shop’s banner slides.</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      <TabPanel key={tab} direction={direction}>
        {tab === 'products' ? <ProductsTab notify={notify} /> : <BannersTab notify={notify} />}
      </TabPanel>
      <SectionNav {...sectionNav} />
    </div>
  )
}
