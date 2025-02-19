"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight, ShoppingBag, User, LogOut, Plus, Minus, X, Copy, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signout } from "./login/actions"
import { createClient } from "@/utils/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

type SessionData = {
  id: string
  code: string
  created_by: string
}

type Participant = {
  id: string
  user_id: string
  joined_at: string
  profiles: {
    email: string
    // add other fields if needed
  }
}

export default function Page() {
  // -------------------------------
  // Local State
  // -------------------------------
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  // sessionData holds the active session (created or joined)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  // sessionUsers holds the list of participants (with profiles.email)
  const [sessionUsers, setSessionUsers] = useState<Participant[]>([])
  const supabase = createClient()
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [joinSessionCode, setJoinSessionCode] = useState("")
  // New: Participants dialog to view participant emails
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false)
  const [sessionCartItems, setSessionCartItems] = useState<CartItem[]>([])
  const [personalCartItems, setPersonalCartItems] = useState<CartItem[]>([])


  console.log("sessionCartItems", sessionCartItems)

  // -------------------------------
  // Cart helper functions
  // -------------------------------
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

  // -------------------------------
  // Session Creation Logic
  // -------------------------------
  // Helper function to generate a random 6-character session code
  const generateRandomCode = (length = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Create a new session by generating a code and adding the current user to it.
  const generateSessionCode = useCallback(async () => {
    // Block if user is already in a session
    if (sessionData) {
      toast.error("You are already in a session")
      return
    }
    setIsGeneratingCode(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("User not logged in")
      setIsGeneratingCode(false)
      return
    }
    const userId = user.id

    // Check if the user already created (or joined) a session.
    const { data: existingSession } = await supabase.from("sessions").select("*").eq("created_by", userId).single()

    if (existingSession) {
      setSessionCode(existingSession.code)
      console.log("existingSession", existingSession)
      setSessionData(existingSession)
      setIsGeneratingCode(false)
      return
    }

    const code = generateRandomCode()

    const { data: newSession, error: sessionError } = await supabase
      .from("sessions")
      .insert([{ code, created_by: userId }])
      .select()
      .single()
    if (sessionError) {
      toast.error("Error creating session")
      setIsGeneratingCode(false)
      return
    }

    const { error: joinError } = await supabase
      .from("session_users")
      .insert([{ session_id: newSession.id, user_id: userId }])
    if (joinError) {
      toast.error("Error adding you to session")
      setIsGeneratingCode(false)
      return
    }

    setSessionCode(newSession.code)
    setSessionData(newSession)
    setIsGeneratingCode(false)
  }, [supabase, sessionData])

  // On mount, check if the current user already created or joined a session.
  useEffect(() => {
    const checkActiveSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      console.log("user", user)

      // Check for session created by the user.
      const { data: activeSession } = await supabase.from("sessions").select("*").eq("created_by", user.id).single()
      if (activeSession) {
        setSessionCode(activeSession.code)
        console.log("activeSession", activeSession)
        setSessionData(activeSession)
      } else {
        // Optionally, check if the user has joined any session.
        const { data: joinedSession } = await supabase
          .from("session_users")
          .select("session_id, sessions(code, created_by)")
          .eq("user_id", user.id)
          .single()
        if (joinedSession && joinedSession.sessions) {
          setSessionCode(joinedSession.sessions.code)
          setSessionData({
            id: joinedSession.session_id,
            code: joinedSession.sessions.code,
            created_by: joinedSession.sessions.created_by,
          })
        }
      }
    }
    checkActiveSession()
  }, [supabase])

  // -------------------------------
  // Join Session Logic
  // -------------------------------
  // Called when a user enters a session code and clicks "Join"
  const joinSession = async () => {
    // Block if user is already in a session
    if (sessionData) {
      toast.error("You are already in a session")
      return
    }
    if (!joinSessionCode) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("User not logged in")
      return
    }

    const { data: foundSession, error: sessionError } = await supabase
      .from("sessions")
      .select("id, code, created_by")
      .eq("code", joinSessionCode)
      .single()
    if (sessionError || !foundSession) {
      toast.error("Session not found")
      return
    }

    if (foundSession.created_by === user.id) {
      toast.error("You cannot join your own session")
      return
    }

    const { count, error: countError } = await supabase
      .from("session_users")
      .select("*", { count: "exact", head: true })
      .eq("session_id", foundSession.id)
    if (countError) {
      toast.error("Error checking session capacity")
      return
    }
    if (count >= 5) {
      toast.error("Session is full")
      return
    }

    const { error: joinError } = await supabase
      .from("session_users")
      .insert([{ session_id: foundSession.id, user_id: user.id }])
    if (joinError) {
      toast.error("Error joining session")
      return
    }

    toast.success("Successfully joined session")

    setSessionData(foundSession)
    setSessionCode(foundSession.code)
    setIsJoinDialogOpen(false)
    setJoinSessionCode("")
  }

  // -------------------------------
  // Realtime subscription for session participants
  // -------------------------------
  useEffect(() => {
    if (!sessionData) return

    // Helper to fetch session users (with profiles.email)
    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from("session_users")
        .select("*, profiles(email)")
        .eq("session_id", sessionData.id)
      if (!error && data) {
        setSessionUsers(data)
      }
    }
    fetchSessionUsers()

    const subscription = supabase
      .channel(`session-users-${sessionData.id}`, {
        config: { broadcast: { ack: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_users",
          filter: `session_id=eq.${sessionData.id}`,
        },
        async (payload) => {
          console.log("Received realtime payload:", payload);

          await fetchSessionUsers()
          if (payload.eventType === "INSERT") {
            toast.success("A user joined the session")
          }
          if (payload.eventType === "DELETE") {
            // Get the current authenticated user info
            const {
              data: { user },
            } = await supabase.auth.getUser()
            // If the deleted row belongs to the session creator…
            if (payload.old.user_id === sessionData.created_by) {
              setSessionData(null)
              setSessionCode(null)
              setSessionUsers([])
              toast("Session creator disconnected. All users have been disconnected.")
            }
            // Otherwise, if the current user is the session creator,
            // notify them of who disconnected
            else if (sessionData.created_by === user.id) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", payload.old.user_id)
                .single()
              if (profileData) {
                toast(`User ${profileData.email} has disconnected`)
              } else {
                toast("A user has disconnected")
              }
            }
          }
        },
      )
      .subscribe()

    return () => {
      console.log("Unsubscribing from channel");
      subscription.unsubscribe()
    }
  }, [supabase, sessionData])

  // -------------------------------
  // Helper: Copy session code to clipboard
  // -------------------------------
  const copyToClipboard = useCallback(() => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode)
      toast.success("Copied to clipboard")
    }
  }, [sessionCode])

  // Updated disconnect function
  const disconnectFromSession = useCallback(async () => {
    if (!sessionData) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Check if the current user is the session creator
    if (sessionData.created_by === user.id) {
      // Option 1: Delete related rows manually
      // Delete session cart items
      const { error: cartError } = await supabase
        .from("session_cart_items")
        .delete()
        .match({ session_id: sessionData.id })
      if (cartError) {
        toast.error("Error deleting session cart items")
        return
      }

      // Delete all session_users for the session
      const { error: usersError } = await supabase
        .from("session_users")
        .delete()
        .match({ session_id: sessionData.id })
      if (usersError) {
        toast.error("Error disconnecting session")
        return
      }
      const { error: sessionDeleteError } = await supabase
        .from("sessions")
        .delete()
        .match({ id: sessionData.id });
      if (sessionDeleteError) {
        toast.error("Error deleting session");
        return;
      }


      setSessionData(null)
      setSessionCode(null)
      setSessionUsers([])
      toast("Session creator disconnected. All users have been disconnected.")
    } else {
      // A participant is disconnecting: remove only their row
      const { error } = await supabase
        .from("session_users")
        .delete()
        .match({ session_id: sessionData.id, user_id: user.id })
      if (error) {
        toast.error("Error disconnecting from session")
        return
      }
      setSessionUsers((prev) => prev.filter((p) => p.user_id !== user.id))
      toast.success("You have disconnected from the session")
    }
  }, [supabase, sessionData])


  useEffect(() => {
    if (!sessionData) return

    const fetchSessionCartItems = async () => {
      const { data, error } = await supabase.from("session_cart_items").select("*").eq("session_id", sessionData.id)
      if (!error && data) {
        setSessionCartItems(data)
      }
    }

    fetchSessionCartItems()

    const sessionCartSubscription = supabase
      .channel(`session-cart-${sessionData.id}`, {
        config: { broadcast: { ack: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_cart_items",
          filter: `session_id=eq.${sessionData.id}`,
        },
        async () => {
          await fetchSessionCartItems()
        },
      )
      .subscribe()

    return () => {
      sessionCartSubscription.unsubscribe()
    }
  }, [supabase, sessionData])

  useEffect(() => {
    const fetchPersonalCartItems = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from("personal_cart_items").select("*").eq("user_id", user.id)
      if (!error && data) {
        setPersonalCartItems(data)
      }
    }

    fetchPersonalCartItems()

    const personalCartSubscription = supabase
      .channel("personal-cart", {
        config: { broadcast: { ack: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "personal_cart_items",
          // Optionally filter by user id if needed
        },
        async () => {
          await fetchPersonalCartItems()
        },
      )
      .subscribe()

    return () => {
      personalCartSubscription.unsubscribe()
    }
  }, [supabase])

  const addToSessionCart = async (item: Omit<CartItem, "quantity">) => {
    if (!sessionData) {
      toast.error("No active session")
      return
    }
    // Upsert: if an item exists for this session, increment its quantity
    const { error } = await supabase.from("session_cart_items").upsert(
      [
        {
          session_id: sessionData.id,
          item_id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: 1,
        },
      ],
      { onConflict: "session_id,item_id" },
    )

    if (error) {
      toast.error("Error adding item to shared cart")
    }
  }

  const addToPersonalCart = async (item: Omit<CartItem, "quantity">) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("User not logged in")
      return
    }
    // Upsert into the personal cart table for this user
    const { error } = await supabase.from("personal_cart_items").upsert(
      [
        {
          user_id: user.id,
          item_id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: 1,
        },
      ],
      { onConflict: "user_id,item_id" },
    )
    if (error) {
      toast.error("Error adding item to personal cart")
    }
  }

  const updatePersonalCartQuantity = async (itemId: string, delta: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("personal_cart_items")
      .select("quantity")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .single()

    if (error) {
      toast.error("Error updating item quantity")
      return
    }

    const newQuantity = Math.max(0, (data?.quantity || 0) + delta)

    if (newQuantity === 0) {
      await removeFromPersonalCart(itemId)
    } else {
      const { error: updateError } = await supabase
        .from("personal_cart_items")
        .update({ quantity: newQuantity })
        .eq("user_id", user.id)
        .eq("item_id", itemId)

      if (updateError) {
        toast.error("Error updating item quantity")
      }
    }
  }

  const removeFromPersonalCart = async (itemId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("personal_cart_items").delete().eq("user_id", user.id).eq("item_id", itemId)

    if (error) {
      toast.error("Error removing item from cart")
    }
  }

  const updateSessionCartQuantity = async (itemId: string, delta: number) => {
    if (!sessionData) return

    const { data, error } = await supabase
      .from("session_cart_items")
      .select("quantity")
      .eq("session_id", sessionData.id)
      .eq("item_id", itemId)
      .single()

    if (error) {
      toast.error("Error updating item quantity")
      return
    }

    const newQuantity = Math.max(0, (data?.quantity || 0) + delta)

    if (newQuantity === 0) {
      await removeFromSessionCart(itemId)
    } else {
      const { error: updateError } = await supabase
        .from("session_cart_items")
        .update({ quantity: newQuantity })
        .eq("session_id", sessionData.id)
        .eq("item_id", itemId)

      if (updateError) {
        toast.error("Error updating item quantity")
      }
    }
  }

  const removeFromSessionCart = async (itemId: string) => {
    if (!sessionData) return

    const { error } = await supabase
      .from("session_cart_items")
      .delete()
      .eq("session_id", sessionData.id)
      .eq("item_id", itemId)

    if (error) {
      toast.error("Error removing item from session cart")
    }
  }

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
            {/* If a session is active, display the session code with participant avatars and a button to view details */}
            {sessionCode && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-100 rounded-full px-4 border border-gray-700">
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
                <div className="flex items-center">
                  <TooltipProvider>
                    <span className="inline-flex items-center -space-x-4 mr-2">
                      {sessionUsers.slice(0, 5).map((participant) => (
                        <Tooltip key={participant.id}>
                          <TooltipTrigger asChild>
                            <Avatar className="w-8 h-8 border-2 border-white">
                              <AvatarFallback>{participant.profiles?.email?.[0].toUpperCase() || "?"}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{participant.profiles?.email || "No email available"}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {sessionUsers.length > 5 && (
                        <Avatar className="w-8 h-8 border-2 border-white">
                          <AvatarFallback>+{sessionUsers.length - 5}</AvatarFallback>
                        </Avatar>
                      )}
                    </span>
                  </TooltipProvider>
                  <Button variant="outline" size="sm" onClick={() => setIsParticipantsDialogOpen(true)}>
                    Details
                  </Button>
                  <Button variant="outline" size="sm" onClick={disconnectFromSession} className="ml-2">
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
            {/* Block join and create if already in a session */}
            {!sessionCode && (
              <>
                <Button
                  onClick={generateSessionCode}
                  disabled={isGeneratingCode}
                  className="rounded-full px-4 h-12 bg-black text-white hover:bg-black/90"
                >
                  {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Live Session
                </Button>
                <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full px-4 h-12 bg-white text-black border border-black hover:bg-gray-100">
                      Join Live Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join Live Session</DialogTitle>
                      <DialogDescription>Enter the 6-digit code to join an existing session.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        placeholder="Enter session code"
                        value={joinSessionCode}
                        onChange={(e) => setJoinSessionCode(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <Button onClick={joinSession}>Join</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {/* Participants Dialog */}
            <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Session Participants</DialogTitle>
                  <DialogDescription>Below are the participants in this session.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <TooltipProvider>
                    {sessionUsers.map((participant) => (
                      <div key={participant.id} className="flex items-center space-x-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>{participant.profiles?.email?.[0].toUpperCase() || "?"}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{participant.profiles?.email || "No email available"}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-sm text-gray-700">
                          {participant.profiles?.email || "No email available"}
                        </span>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </DialogContent>
            </Dialog>
            {/* Cart Sheet */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12 relative">
                  <ShoppingBag className="h-5 w-5" />
                  {(personalCartItems.length > 0 || sessionCartItems.length > 0) && (
                    <span className="absolute top-0 right-0 bg-rose-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {personalCartItems.length + sessionCartItems.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                  <SheetDescription>Manage your personal and session items</SheetDescription>
                </SheetHeader>
                <Tabs defaultValue="personal" className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">Personal Cart</TabsTrigger>
                    <TabsTrigger value="session">Session Cart</TabsTrigger>
                  </TabsList>
                  <TabsContent value="personal" className="mt-4">
                    <div className="space-y-4">
                      {personalCartItems.length === 0 ? (
                        <p className="text-center text-gray-500">Your personal cart is empty</p>
                      ) : (
                        personalCartItems.map((item) => (
                          <div key={item.item_id} className="flex items-center space-x-4">
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
                                  onClick={() => updatePersonalCartQuantity(item.item_id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6"
                                  onClick={() => updatePersonalCartQuantity(item.item_id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => removeFromPersonalCart(item.item_id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                    {personalCartItems.length > 0 && (
                      <div className="mt-6 space-y-4">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total</span>
                          <span>
                            ${personalCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                          </span>
                        </div>
                        <Button className="w-full">Checkout Personal Cart</Button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="session" className="mt-4">
                    <div className="space-y-4">
                      {sessionCartItems.length === 0 ? (
                        <p className="text-center text-gray-500">The session cart is empty</p>
                      ) : (
                        sessionCartItems.map((item) => (
                          <div key={item.item_id} className="flex items-center space-x-4">
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
                                  onClick={() => updateSessionCartQuantity(item.item_id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6"
                                  onClick={() => updateSessionCartQuantity(item.item_id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => removeFromSessionCart(item.item_id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                    {sessionCartItems.length > 0 && (
                      <div className="mt-6 space-y-4">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total</span>
                          <span>
                            ${sessionCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                          </span>
                        </div>
                        <Button className="w-full">Checkout Session Cart</Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
            {/* User Dropdown */}
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
        {/* Main banner */}
        <section className="relative min-h-screen flex items-center pt-20">
          <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="relative h-full">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg"
                alt="Pink power suit"
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

        {/* Featured pieces */}
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
                        addToSessionCart({
                          id: "casual-luxe",
                          name: "Casual Luxe",
                          price: 299,
                          image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sydne-Style-shows-how-to-wear-the-maxi-skirt-trend-with-summer-outfit-ideas-by-fashion-blogger-andee-layne-2883476417.jpg-6XpLdf2OozNDq0vxMvNP9wjmOZoccw.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Shared Cart
                    </Button>
                    <Button
                      onClick={() =>
                        addToPersonalCart({
                          id: "casual-luxe",
                          name: "Casual Luxe",
                          price: 299,
                          image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sydne-Style-shows-how-to-wear-the-maxi-skirt-trend-with-summer-outfit-ideas-by-fashion-blogger-andee-layne-2883476417.jpg-6XpLdf2OozNDq0vxMvNP9wjmOZoccw.jpeg",
                        })
                      }
                      className="bg-black text-white hover:bg-black/90"
                    >
                      Add to Personal Cart
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
                        addToSessionCart({
                          id: "evening-drama",
                          name: "Evening Drama",
                          price: 499,
                          image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Shared Cart
                    </Button>
                    <Button
                      onClick={() =>
                        addToPersonalCart({
                          id: "evening-drama",
                          name: "Evening Drama",
                          price: 499,
                          image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg",
                        })
                      }
                      className="bg-black text-white hover:bg-black/90"
                    >
                      Add to Personal Cart
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
                        addToSessionCart({
                          id: "power-play",
                          name: "Power Play",
                          price: 599,
                          image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Shared Cart
                    </Button>
                    <Button
                      onClick={() =>
                        addToPersonalCart({
                          id: "power-play",
                          name: "Power Play",
                          price: 599,
                          image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg",
                        })
                      }
                      className="bg-black text-white hover:bg-black/90"
                    >
                      Add to Personal Cart
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter / Subscribe section */}
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

