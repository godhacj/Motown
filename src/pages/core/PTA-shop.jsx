import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag, FiChevronLeft, FiChevronRight, FiTag } from 'react-icons/fi'
import { products as FALLBACK_PRODUCTS, billboardImages, CATEGORIES as FALLBACK_CATEGORIES } from '../../routes/shopProducts'
import '../../styles/core/PTA-shop.css'
import API from '../../config/api'

// billboard images stay as-is (Unsplash URLs, no backend needed)
const BILLBOARD = billboardImages

function normalise(p) {
  return {
    ...p,
    id: p._id || p.id,
    image: p.image?.startsWith('/media/') ? `${API}${p.image}` : p.image,
  }
}

function Avatar({ size = 36 }) {
  return (
    <div className="shop-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      PTA
    </div>
  )
}

function ProductCard({ product, cartQty, onAdd, onRemove }) {
  return (
    <div className="shop-card">
      <div className="shop-card__img-wrap">
        <img src={product.image} alt={product.name} className="shop-card__img" loading="lazy" />
        <span className="shop-card__category">{product.category}</span>
      </div>
      <div className="shop-card__body">
        <h3 className="shop-card__name">{product.name}</h3>
        <p className="shop-card__desc">{product.description}</p>
        <div className="shop-card__footer">
          <span className="shop-card__price">GH₵{Number(product.price).toFixed(2)}</span>
          {cartQty === 0 ? (
            <button className="shop-card__add-btn" onClick={() => onAdd(product)} aria-label="Add to cart">
              <FiPlus /> Add
            </button>
          ) : (
            <div className="shop-card__qty-ctrl">
              <button className="shop-card__qty-btn" onClick={() => onRemove(product.id)} aria-label="Remove one">
                <FiMinus />
              </button>
              <span className="shop-card__qty-num">{cartQty}</span>
              <button className="shop-card__qty-btn" onClick={() => onAdd(product)} aria-label="Add one more">
                <FiPlus />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CartItem({ item, onAdd, onRemove, onDelete }) {
  return (
    <div className="cart-item">
      <img src={item.image} alt={item.name} className="cart-item__img" />
      <div className="cart-item__info">
        <span className="cart-item__name">{item.name}</span>
        <span className="cart-item__price">GH₵{(item.price * item.qty).toFixed(2)}</span>
      </div>
      <div className="cart-item__controls">
        <button className="cart-item__btn" onClick={() => onRemove(item.id)} aria-label="Remove one"><FiMinus /></button>
        <span className="cart-item__qty">{item.qty}</span>
        <button className="cart-item__btn" onClick={() => onAdd(item)} aria-label="Add one"><FiPlus /></button>
        <button className="cart-item__btn cart-item__btn--delete" onClick={() => onDelete(item.id)} aria-label="Remove item"><FiTrash2 /></button>
      </div>
    </div>
  )
}

export default function PTAShop() {
  const { setSideMenu, setNotchText, setSearchConfig } = useOutletContext()
  const navigate = useNavigate()

  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [currentSlide,   setCurrentSlide]   = useState(0)
  const [fade,           setFade]           = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart,           setCart]           = useState([])
  const [cartOpen,       setCartOpen]       = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')

  // Fetch products from API, fall back to static list
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/products`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) setProducts(data.map(normalise)) })
      .catch(() => { if (!cancelled) setProducts(FALLBACK_PRODUCTS.map(normalise)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Derive categories from live data
  const categories = useMemo(() => {
    if (products.length === 0) return FALLBACK_CATEGORIES
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
    return ['All', ...cats]
  }, [products])

  useEffect(() => {
    setNotchText('PTA Shop')
    setSearchConfig({
      visible: true,
      placeholder: 'Search products…',
      Icon: Icons.shopping,
      handler: (q) => setSearchQuery(q.toLowerCase()),
    })
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map',      to: '/map',      icon: Icons.map },
      { title: 'Page',     to: '/page',     icon: Icons.page },
      { title: 'About',    to: '/about',    icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText, setSearchConfig])

  // Auto-advance billboard
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentSlide(p => (p + 1) % BILLBOARD.length)
        setFade(true)
      }, 250)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  const prevSlide = () => setCurrentSlide(p => (p - 1 + BILLBOARD.length) % BILLBOARD.length)
  const nextSlide = () => setCurrentSlide(p => (p + 1) % BILLBOARD.length)

  // Cart helpers
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }, [])

  const removeOne = useCallback((id) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      if (item.qty === 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i)
    })
  }, [])

  const deleteItem = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id))
  }, [])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesCat    = activeCategory === 'All' || p.category === activeCategory
    const matchesSearch = !searchQuery
      || p.name?.toLowerCase().includes(searchQuery)
      || p.description?.toLowerCase().includes(searchQuery)
    return matchesCat && matchesSearch
  }), [products, activeCategory, searchQuery])

  const goToCheckout = () => {
    if (cart.length === 0) return
    navigate('/pta-shop/checkout', { state: { cart, total: cartTotal } })
  }

  return (
    <div className="shop-main">
      <div className="shop-scroll">

        {/* ── Billboard ── */}
        <div className="shop-billboard">
          <img
            src={BILLBOARD[currentSlide]}
            alt={`Promotion ${currentSlide + 1}`}
            className={`shop-billboard__img${fade ? '' : ' shop-billboard__img--fade'}`}
          />
          <div className="shop-billboard__overlay" />
          <div className="shop-billboard__text">
            <span className="shop-billboard__eyebrow">Achimota School</span>
            <h1 className="shop-billboard__title">PTA Shop</h1>
            <p className="shop-billboard__sub">Official school merchandise &amp; supplies</p>
          </div>
          <button className="shop-billboard__nav shop-billboard__nav--prev" onClick={prevSlide} aria-label="Previous">
            <FiChevronLeft />
          </button>
          <button className="shop-billboard__nav shop-billboard__nav--next" onClick={nextSlide} aria-label="Next">
            <FiChevronRight />
          </button>
          <div className="shop-billboard__dots">
            {BILLBOARD.map((_, i) => (
              <button
                key={i}
                className={`shop-billboard__dot${i === currentSlide ? ' shop-billboard__dot--active' : ''}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="shop-body">

          {/* ── Categories ── */}
          <div className="shop-categories">
            {categories.map(cat => (
              <button
                key={cat}
                className={`shop-cat-btn${activeCategory === cat ? ' shop-cat-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'All' ? <Icons.shopping /> : <FiTag />}
                {cat}
              </button>
            ))}
          </div>

          {/* ── Main content grid ── */}
          <div className="shop-content">

            {/* Product grid */}
            <section className="shop-products">
              <div className="shop-section-header">
                <h2 className="shop-section-title">
                  {activeCategory === 'All' ? 'All Products' : activeCategory}
                  <span className="shop-section-count">{filteredProducts.length}</span>
                </h2>
              </div>

              {loading ? (
                <div className="shop-empty"><FiShoppingBag /><p>Loading products…</p></div>
              ) : filteredProducts.length === 0 ? (
                <div className="shop-empty"><FiShoppingBag /><p>No products found.</p></div>
              ) : (
                <div className="shop-grid">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cartQty={cart.find(i => i.id === product.id)?.qty || 0}
                      onAdd={addToCart}
                      onRemove={removeOne}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Cart sidebar */}
            <aside className={`shop-cart${cartOpen ? ' shop-cart--open' : ''}`}>
              <div className="shop-cart__header">
                <h2 className="shop-cart__title">
                  <FiShoppingBag />
                  Cart
                  {cartCount > 0 && <span className="shop-cart__badge">{cartCount}</span>}
                </h2>
              </div>

              <div className="shop-cart__body">
                {cart.length === 0 ? (
                  <div className="shop-cart__empty">
                    <FiShoppingBag />
                    <p>Your cart is empty.</p>
                    <span>Add items from the product list.</span>
                  </div>
                ) : (
                  <div className="shop-cart__items">
                    {cart.map(item => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onAdd={addToCart}
                        onRemove={removeOne}
                        onDelete={deleteItem}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="shop-cart__footer">
                <div className="shop-cart__total-row">
                  <span className="shop-cart__total-label">Total</span>
                  <span className="shop-cart__total-amount">GH₵{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  className="shop-cart__checkout-btn"
                  onClick={goToCheckout}
                  disabled={cart.length === 0}
                >
                  Proceed to Checkout
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Floating cart button (mobile) */}
      {cartCount > 0 && (
        <button
          className={`shop-cart-fab${cartOpen ? ' shop-cart-fab--active' : ''}`}
          onClick={() => setCartOpen(v => !v)}
          aria-label="Open cart"
        >
          <FiShoppingBag />
          <span className="shop-cart-fab__label">{cartOpen ? 'Close Cart' : 'View Cart'}</span>
          <span className="shop-cart-fab__badge">{cartCount}</span>
        </button>
      )}
    </div>
  )
}
