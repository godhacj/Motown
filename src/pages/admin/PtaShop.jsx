import React, { useState } from 'react'
import { FiShoppingBag, FiImage } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { Tabs, Notice } from '../../components/admin/AdminKit'
import { useNotice } from '../../components/admin/adminUtils'
import ProductsTab from './pta/ProductsTab'
import BannersTab from './pta/BannersTab'
import '../../styles/PageContent.css'

const TAB_KEY = 'adminPtaTab'
const readTab = () => { try { return localStorage.getItem(TAB_KEY) || 'products' } catch { return 'products' } }

export default function PtaShop() {
  const session = useAdminPortal('PTA Shop', null)
  const [tab, setTabState] = useState(readTab)
  const [notice, notify, clearNotice] = useNotice()
  const setTab = (t) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t) } catch { /* private mode */ } }

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>PTA Shop</h1>
        <p>Items for sale in the PTA shop, their suppliers and paperwork, and the shop’s banner slides.</p>
      </div>
      <Tabs tabs={[{ id: 'products', label: 'Products', icon: FiShoppingBag }, { id: 'banners', label: 'Banners', icon: FiImage }]} value={tab} onChange={setTab} />
      <Notice notice={notice} onClose={clearNotice} />
      {tab === 'products' ? <ProductsTab notify={notify} /> : <BannersTab notify={notify} />}
    </div>
  )
}
