import React, { useState, useEffect } from 'react'
import { FiPlus } from 'react-icons/fi'
import PaymentPortal from '../../components/Payment-portal'
import { Icons } from '../../assets/icons'
import { useOutletContext } from 'react-router-dom'
import { products, billboardImages } from './files/shopProducts'
import '../../styles/core/PTA-shop.css'

export default function PTAShop() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [cart, setCart] = useState([])
  const [currentImage, setCurrentImage] = useState(0)
  const [showPaymentPortal, setShowPaymentPortal] = useState(false)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    setNotchText('PTA Shop');
    setSearchConfig({
      visible: true,
      placeholder: 'Search shop',
      Icon: Icons.shopping,
      handler: (q) => console.log('Shop search:', q)
    });
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSearchConfig, setSideMenu, setNotchText])

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentImage((prev) => (prev + 1) % billboardImages.length)
        setFade(true)
      }, 250)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const addToCart = (product) => {
    setCart([...cart, product])
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const totalPrice = cart.reduce((total, item) => total + item.price, 0)

  const goToImage = (index) => {
    setCurrentImage(index)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + billboardImages.length) % billboardImages.length)
  }

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % billboardImages.length)
  }

  const handleBuy = () => {
    setShowPaymentPortal(true)
  }

  const handleCheckout = () => {
    setShowPaymentPortal(true)
  }

  const closePaymentPortal = () => {
    setShowPaymentPortal(false)
  }

  return (
    <div className="pta-shop-main">
      <div className="head">
        <div className="billboard">
          <img
            src={billboardImages[currentImage]}
            alt={`Promotion ${currentImage + 1}`}
            className={`billboard-image ${fade ? '' : 'fade'}`}
          />
          <div className="billboard-title">Welcome to PTA Shop</div>
          <button className="billboard-prev" onClick={prevImage}>{''}</button>
          <button className="billboard-next" onClick={nextImage}>{''}</button>
          <div className="billboard-indicators">
            {billboardImages.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentImage ? 'active' : ''}`}
                onClick={() => goToImage(index)}
              />
            ))}
          </div>
          {/* <section className="pta-shop__products">
            <div className="pta-shop__grid">
              {products.map(product => (
                <div key={product.id} className="pta-shop__product-card">
                  <button
                    className="pta-shop__add-to-cart-icon"
                    onClick={handleBuy}
                  >
                    <FiPlus />
                  </button>
                  <div className="pta-shop__product-image-container">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="pta-shop__product-image"
                    />
                  </div>
                  <div className="pta-shop__product-info">
                    <h3 className="pta-shop__product-name">{product.name}</h3>
                    <p className="pta-shop__product-description">{product.description}</p>
                    <div className="pta-shop__product-bottom">
                      <span className="pta-shop__product-price">
                        GH₵{product.price.toFixed(2)}
                      </span>
                      <button className="pta-shop__buy-btn" onClick={handleBuy}>
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section> */}
        </div>
      </div>



      {showPaymentPortal && <PaymentPortal onClose={closePaymentPortal} />}
    </div>
  )
}
