"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight, ShoppingBag, User, LogOut, Plus, Minus, X, Copy, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useCallback } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signout } from "./login/actions"

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

export default function Page() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [sessionCode, setSessionCode] = useState<string | null>(null)

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)
      if (existingItem) {
        return prevItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prevItems, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const generateSessionCode = useCallback(() => {
    setIsGeneratingCode(true)
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setSessionCode(code)
      setIsGeneratingCode(false)
    }, 1500) // Simulating API call delay
  }, [])

  const copyToClipboard = useCallback(() => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode)
    }
  }, [sessionCode])

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="fixed w-full z-50 bg-white/80 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between px-4">
          <Link href="#" className="text-3xl font-bold tracking-tighter">
            ATELIER
          </Link>
          <nav className="hidden md:flex gap-8">
            <Link href="#" className="text-sm font-medium hover:text-rose-200 transition-colors">
              COLLECTIONS
            </Link>
            <Link href="#" className="text-sm font-medium hover:text-rose-200 transition-colors">
              LOOKBOOK
            </Link>
            <Link href="#" className="text-sm font-medium hover:text-rose-200 transition-colors">
              ABOUT
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {!sessionCode && <Button
              onClick={generateSessionCode}
              disabled={isGeneratingCode}
              className="rounded-full px-4 h-12 bg-black text-white hover:bg-black/90"
            >
              {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Live Session
            </Button>}
            {sessionCode && (
              <div className="flex items-center bg-gray-100 rounded-full h-12 px-4 border border-gray-700">
                <input
                  type="text"
                  value={sessionCode}
                  readOnly
                  className="bg-transparent border-none focus:outline-none text-sm font-medium"
                />
                <Button onClick={copyToClipboard} size="icon" variant="ghost" className="ml-2 h-8 w-8">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12 relative">
                  <ShoppingBag className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 bg-rose-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                  <SheetDescription>
                    You have {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={60}
                        height={60}
                        className="rounded-md"
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {cartItems.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <Button className="w-full">Checkout</Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <form action={signout} method="post">
                    <button type="submit" className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative min-h-screen flex items-center pt-20">
          <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="relative h-full">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg"
                alt="Pink tailored blazer suit"
                fill
                className="object-cover rounded-lg"
                priority
              />
              <div className="absolute inset-0 bg-black/10 rounded-lg" />
            </div>
            <div className="relative h-full hidden md:block">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg"
                alt="Black statement suit"
                fill
                className="object-cover rounded-lg"
                priority
              />
              <div className="absolute inset-0 bg-black/10 rounded-lg" />
            </div>
          </div>
          <div className="container relative px-4 py-24 md:py-32">
            <div className="max-w-2xl relative backdrop-blur-sm bg-white/30 p-6 md:p-12 rounded-lg">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-6">
                BOLD
                <br />
                REFINED
                <br />
                POWERFUL
              </h1>
              <p className="text-lg md:text-xl mb-8 text-gray-800">
                Where sophistication meets audacity. Discover pieces that define the modern power aesthetic.
              </p>
              <Button size="lg" className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-14 text-lg">
                Explore Collection
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-24 md:py-32 bg-gray-50">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row justify-between items-start mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 md:mb-0">
                Featured
                <br />
                Pieces
              </h2>
              <p className="max-w-md text-lg text-gray-600">
                Each piece is a statement of individuality, crafted for those who dare to stand out.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="group relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sydne-Style-shows-how-to-wear-the-maxi-skirt-trend-with-summer-outfit-ideas-by-fashion-blogger-andee-layne-2883476417.jpg-6XpLdf2OozNDq0vxMvNP9wjmOZoccw.jpeg"
                  alt="Elegant casual outfit"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-2xl font-bold text-white mb-2">Casual Luxe</h3>
                  <p className="text-white/80 mb-4">Effortless elegance for the modern sophisticate</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                      Shop Now
                    </Button>
                    <Button
                      onClick={() =>
                        addToCart({
                          id: "casual-luxe",
                          name: "Casual Luxe",
                          price: 299,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sydne-Style-shows-how-to-wear-the-maxi-skirt-trend-with-summer-outfit-ideas-by-fashion-blogger-andee-layne-2883476417.jpg-6XpLdf2OozNDq0vxMvNP9wjmOZoccw.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg"
                  alt="Statement black suit"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-2xl font-bold text-white mb-2">Evening Drama</h3>
                  <p className="text-white/80 mb-4">Make an entrance in bold silhouettes</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                      Shop Now
                    </Button>
                    <Button
                      onClick={() =>
                        addToCart({
                          id: "evening-drama",
                          name: "Evening Drama",
                          price: 499,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-lg lg:col-span-1 md:col-span-2 lg:translate-y-12">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg"
                  alt="Pink power suit"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-2xl font-bold text-white mb-2">Power Play</h3>
                  <p className="text-white/80 mb-4">Commanding presence in every stitch</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                      Shop Now
                    </Button>
                    <Button
                      onClick={() =>
                        addToCart({
                          id: "power-play",
                          name: "Power Play",
                          price: 599,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="container px-4">
            <div className="relative z-10 bg-black text-white rounded-2xl p-8 md:p-16 overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg')] opacity-20 blur-sm" />
              <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Join the ATELIER Circle</h2>
                <p className="text-lg text-gray-300">
                  Be the first to experience our latest collections and exclusive events.
                </p>
                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 rounded-full px-6 py-3 bg-white/10 border border-white/20 text-white placeholder:text-gray-400"
                  />
                  <Button className="bg-white text-black hover:bg-white/90 rounded-full px-8">Subscribe</Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gray-200">
        <div className="container px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">COLLECTIONS</h3>
              <div className="space-y-2">
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  New Arrivals
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Bestsellers
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Classics
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4">SUPPORT</h3>
              <div className="space-y-2">
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Contact
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Shipping
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Returns
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4">ABOUT</h3>
              <div className="space-y-2">
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Our Story
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Sustainability
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Careers
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4">FOLLOW US</h3>
              <div className="space-y-2">
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Instagram
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Pinterest
                </Link>
                <Link href="#" className="block text-sm text-gray-600 hover:text-black">
                  Twitter
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            © 2024 ATELIER. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

