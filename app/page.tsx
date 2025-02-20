"use client"

import { Button } from "@/components/ui/button"
import {
  ChevronRight,
  ShoppingBag,
  User,
  LogOut,
  Plus,
  Minus,
  X,
  Copy,
  Loader2,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// -----------------------------------------------------------------------------
// Agora Imports for Video Streaming
// -----------------------------------------------------------------------------
import {
  LocalUser,
  RemoteUser,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
} from "agora-rtc-react"
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react"

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

type CartItem = {
  item_id: string
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
  }
}

// -----------------------------------------------------------------------------
// Helper functions (outside the component to avoid re-creation)
// -----------------------------------------------------------------------------

/** Generates a random alphanumeric code of given length */
const generateRandomCode = (length = 6): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/** Returns the current authenticated user */
const getUser = async (supabase: ReturnType<typeof createClient>) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// -----------------------------------------------------------------------------
// Reusable component for rendering a cart item row
// -----------------------------------------------------------------------------

type CartItemRowProps = {
  item: CartItem
  onUpdate: (itemId: string, delta: number) => void
  onRemove: (itemId: string) => void
}

function CartItemRow({ item, onUpdate, onRemove }: CartItemRowProps) {
  return (
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
          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => onUpdate(item.item_id, -1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm">{item.quantity}</span>
          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => onUpdate(item.item_id, 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={() => onRemove(item.item_id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Agora Video Calling Components
// -----------------------------------------------------------------------------

type VideoCallProps = {
  appId: string
  channel: string
  token?: string
}

/** Component that contains the video call logic and UI */
const VideoCallComponent = ({ appId, channel, token }: VideoCallProps) => {
  const [callStarted, setCallStarted] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)

  // Log when the user clicks to start the call.
  const handleStartCall = () => {
    console.log("User clicked join video call")
    setCallStarted(true)
  }

  // Join the channel only when callStarted is true.
  const joinResult = useJoin({ appid: appId, channel, token: token ? token : null }, callStarted)

  // Log join result changes.
  useEffect(() => {
    console.log("Join result:", joinResult)
  }, [joinResult])

  // Create local tracks only if call has started.
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(callStarted ? micOn : false)
  const { localCameraTrack } = useLocalCameraTrack(callStarted ? cameraOn : false)

  // Log the local tracks
  useEffect(() => {
    console.log("Local Microphone Track:", localMicrophoneTrack)
  }, [localMicrophoneTrack])
  useEffect(() => {
    console.log("Local Camera Track:", localCameraTrack)
  }, [localCameraTrack])

  // Publish the local audio and video tracks.
  const publishResult = usePublish([localMicrophoneTrack, localCameraTrack])
  useEffect(() => {
    console.log("Publish result:", publishResult)
  }, [publishResult])

  const remoteUsers = useRemoteUsers()
  useEffect(() => {
    console.log("Remote Users:", remoteUsers)
  }, [remoteUsers])

  if (!callStarted) {
    return (
      <div className="flex flex-col items-center">
        <Button onClick={handleStartCall}>Join Video Call</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Controls */}
      <div className="flex space-x-4">
        <Button onClick={() => { setMicOn((prev) => !prev); console.log("Mic toggled:", !micOn) }}>
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </Button>
        <Button onClick={() => { setCameraOn((prev) => !prev); console.log("Camera toggled:", !cameraOn) }}>
          {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
        </Button>
      </div>
      {/* Video Streams */}
      <div className="flex flex-wrap justify-center gap-4">
        {/* Local video */}
        <div style={{ width: "320px", height: "240px" }} className="border">
          <LocalUser
            audioTrack={localMicrophoneTrack}
            videoTrack={localCameraTrack}
            micOn={micOn}
            cameraOn={cameraOn}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        {/* Remote users */}
        {remoteUsers.map((user) => (
          <div key={user.uid} style={{ width: "320px", height: "240px" }} className="border">
            <RemoteUser user={user} style={{ width: "100%", height: "100%" }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Wraps VideoCallComponent in the AgoraRTCProvider */
const VideoCall = ({ appId, channel, token }: VideoCallProps) => {
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  console.log("Initializing Agora client for channel:", channel)
  return (
    <AgoraRTCProvider client={client}>
      <VideoCallComponent appId={appId} channel={channel} token={token} />
    </AgoraRTCProvider>
  )
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function Page() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [sessionUsers, setSessionUsers] = useState<Participant[]>([])
  const supabase = createClient()
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [joinSessionCode, setJoinSessionCode] = useState("")
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false)
  const [sessionCartItems, setSessionCartItems] = useState<CartItem[]>([])
  const [personalCartItems, setPersonalCartItems] = useState<CartItem[]>([])

  // -------------------------------
  // Session Creation Logic
  // -------------------------------
  const generateSessionCode = useCallback(async () => {
    if (sessionData) {
      toast.error("You are already in a session")
      return
    }
    setIsGeneratingCode(true)
    const user = await getUser(supabase)
    if (!user) {
      toast.error("User not logged in")
      setIsGeneratingCode(false)
      return
    }
    const { data: existingSession } = await supabase
      .from("sessions")
      .select("*")
      .eq("created_by", user.id)
      .single()

    if (existingSession) {
      console.log("Existing session found:", existingSession)
      setSessionCode(existingSession.code)
      setSessionData(existingSession)
      setIsGeneratingCode(false)
      return
    }

    const code = generateRandomCode()
    const { data: newSession, error: sessionError } = await supabase
      .from("sessions")
      .insert([{ code, created_by: user.id }])
      .select()
      .single()

    if (sessionError) {
      toast.error("Error creating session")
      console.error("Session creation error:", sessionError)
      setIsGeneratingCode(false)
      return
    }

    const { error: joinError } = await supabase
      .from("session_users")
      .insert([{ session_id: newSession.id, user_id: user.id }])
    if (joinError) {
      toast.error("Error adding you to session")
      console.error("Session join error:", joinError)
      setIsGeneratingCode(false)
      return
    }

    console.log("New session created:", newSession)
    setSessionCode(newSession.code)
    setSessionData(newSession)
    setIsGeneratingCode(false)
  }, [supabase, sessionData])

  useEffect(() => {
    const checkActiveSession = async () => {
      const user = await getUser(supabase)
      if (!user) return
      const { data: activeSession } = await supabase
        .from("sessions")
        .select("*")
        .eq("created_by", user.id)
        .single()
      if (activeSession) {
        console.log("Active session found:", activeSession)
        setSessionCode(activeSession.code)
        setSessionData(activeSession)
      } else {
        const { data: joinedSession } = await supabase
          .from("session_users")
          .select("session_id, sessions(code, created_by)")
          .eq("user_id", user.id)
          .single()
        if (joinedSession && joinedSession.sessions.length > 0) {
          console.log("Joined session found:", joinedSession)
          setSessionCode(joinedSession.sessions[0].code)
          setSessionData({
            id: joinedSession.session_id,
            code: joinedSession.sessions[0].code,
            created_by: joinedSession.sessions[0].created_by,
          })
        }
      }
    }
    checkActiveSession()
  }, [supabase])

  // -------------------------------
  // Join Session Logic
  // -------------------------------
  const joinSession = async () => {
    if (sessionData) {
      toast.error("You are already in a session")
      return
    }
    if (!joinSessionCode) return
    const user = await getUser(supabase)
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
      console.error("Join session error:", sessionError)
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
      console.error("Capacity check error:", countError)
      return
    }
    if (count && count >= 5) {
      toast.error("Session is full")
      return
    }
    const { error: joinError } = await supabase
      .from("session_users")
      .insert([{ session_id: foundSession.id, user_id: user.id }])
    if (joinError) {
      toast.error("Error joining session")
      console.error("Insert join error:", joinError)
      return
    }
    toast.success("Successfully joined session")
    setSessionData(foundSession)
    setSessionCode(foundSession.code)
    setIsJoinDialogOpen(false)
    setJoinSessionCode("")
  }

  // -------------------------------
  // Realtime subscription: Session Participants
  // -------------------------------
  useEffect(() => {
    if (!sessionData) return
    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from("session_users")
        .select("*, profiles(email)")
        .eq("session_id", sessionData.id)
      if (!error && data) {
        console.log("Fetched session users:", data)
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
          console.log("Realtime payload:", payload)
          await fetchSessionUsers()
          if (payload.eventType === "INSERT") {
            toast.success("A user joined the session")
          }
          if (payload.eventType === "DELETE") {
            const user = await getUser(supabase)
            if (payload.old.user_id === sessionData.created_by) {
              setSessionData(null)
              setSessionCode(null)
              setSessionUsers([])
              toast("Session creator disconnected. All users have been disconnected.")
            } else if (sessionData.created_by === user?.id) {
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

  // -------------------------------
  // Disconnect Logic
  // -------------------------------
  const disconnectFromSession = useCallback(async () => {
    if (!sessionData) return
    const user = await getUser(supabase)
    if (!user) return
    if (sessionData.created_by === user.id) {
      const { error: cartError } = await supabase
        .from("session_cart_items")
        .delete()
        .match({ session_id: sessionData.id })
      if (cartError) {
        toast.error("Error deleting session cart items")
        return
      }
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
        .match({ id: sessionData.id })
      if (sessionDeleteError) {
        toast.error("Error deleting session")
        return
      }
      setSessionData(null)
      setSessionCode(null)
      setSessionUsers([])
      toast("Session creator disconnected. All users have been disconnected.")
    } else {
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

  // -------------------------------
  // Session Cart Subscription
  // -------------------------------
  useEffect(() => {
    if (!sessionData) return
    const fetchSessionCartItems = async () => {
      const { data, error } = await supabase
        .from("session_cart_items")
        .select("*")
        .eq("session_id", sessionData.id)
      if (!error && data) {
        console.log("Fetched session cart items:", data)
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

  // -------------------------------
  // Personal Cart Subscription
  // -------------------------------
  useEffect(() => {
    const fetchPersonalCartItems = async () => {
      const user = await getUser(supabase)
      if (!user) return
      const { data, error } = await supabase
        .from("personal_cart_items")
        .select("*")
        .eq("user_id", user.id)
      if (!error && data) {
        console.log("Fetched personal cart items:", data)
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
    const { error } = await supabase.from("session_cart_items").upsert(
      [
        {
          session_id: sessionData.id,
          item_id: item.item_id,
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
    const user = await getUser(supabase)
    if (!user) {
      toast.error("User not logged in")
      return
    }
    const { error } = await supabase.from("personal_cart_items").upsert(
      [
        {
          user_id: user.id,
          item_id: item.item_id,
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
    const user = await getUser(supabase)
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
    const user = await getUser(supabase)
    if (!user) return
    const { error } = await supabase
      .from("personal_cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", itemId)
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

  const totalCartCount = personalCartItems.length + sessionCartItems.length

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* HEADER */}
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
                              <AvatarFallback>
                                {participant.profiles?.email?.[0].toUpperCase() || "?"}
                              </AvatarFallback>
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
                      <DialogDescription>
                        Enter the 6-digit code to join an existing session.
                      </DialogDescription>
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
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12 relative">
                  <ShoppingBag className="h-5 w-5" />
                  {totalCartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-rose-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalCartCount}
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
                          <CartItemRow
                            key={item.item_id}
                            item={item}
                            onUpdate={updatePersonalCartQuantity}
                            onRemove={removeFromPersonalCart}
                          />
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
                          <CartItemRow
                            key={item.item_id}
                            item={item}
                            onUpdate={updateSessionCartQuantity}
                            onRemove={removeFromSessionCart}
                          />
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

      {/* MAIN CONTENT */}
      <main className="flex-1">
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

        {/* Featured Pieces */}
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
              {/* Featured Item 1 */}
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
                          item_id: "casual-luxe",
                          name: "Casual Luxe",
                          price: 299,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sydne-Style-shows-how-to-wear-the-maxi-skirt-trend-with-summer-outfit-ideas-by-fashion-blogger-andee-layne-2883476417.jpg-6XpLdf2OozNDq0vxMvNP9wjmOZoccw.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Shared Cart
                    </Button>
                    <Button
                      onClick={() =>
                        addToPersonalCart({
                          item_id: "casual-luxe",
                          name: "Casual Luxe",
                          price: 299,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sydne-Style-shows-how-to-wear-the-maxi-skirt-trend-with-summer-outfit-ideas-by-fashion-blogger-andee-layne-2883476417.jpg-6XpLdf2OozNDq0vxMvNP9wjmOZoccw.jpeg",
                        })
                      }
                      className="bg-black text-white hover:bg-black/90"
                    >
                      Add to Personal Cart
                    </Button>
                  </div>
                </div>
              </div>
              {/* Featured Item 2 */}
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
                          item_id: "evening-drama",
                          name: "Evening Drama",
                          price: 499,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Shared Cart
                    </Button>
                    <Button
                      onClick={() =>
                        addToPersonalCart({
                          item_id: "evening-drama",
                          name: "Evening Drama",
                          price: 499,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/F29Z8TGDCL0_N0000_1.jpg-voj4jJkQppwcRfkvk4Fe3DMp1uOOdL.jpeg",
                        })
                      }
                      className="bg-black text-white hover:bg-black/90"
                    >
                      Add to Personal Cart
                    </Button>
                  </div>
                </div>
              </div>
              {/* Featured Item 3 */}
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
                          item_id: "power-play",
                          name: "Power Play",
                          price: 599,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg",
                        })
                      }
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Add to Shared Cart
                    </Button>
                    <Button
                      onClick={() =>
                        addToPersonalCart({
                          item_id: "power-play",
                          name: "Power Play",
                          price: 599,
                          image:
                            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rr-dna_ss25-J1MIYfkKjyt8lGklXsHyaKRUZPG4JK.jpeg",
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
                  <Button className="bg-white text-black hover:bg-white/90 rounded-full px-8">
                    Subscribe
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Live Video Session (Agora) */}
        {sessionData && sessionCode && (
          <section className="py-12 bg-gray-100">
            <div className="container px-4">
              <h2 className="text-2xl font-bold text-center mb-4">Live Video Session</h2>
              {/*
                Replace the placeholders below with your actual Agora App ID and temporary token.
                The channel name is set to the session code.
              */}
              <VideoCall
                appId="f36445b62ae64d5d9ab6a86dd9989589"
                token="007eJxTYNil8OHOCY6dfdsfhUw5cXGt1rl1785vujzX9tnCA9E5ggE1CgxpxmYmJqZJZkaJqWYmKaYplolJZokWZikplpYWlqYWlt0529IbAhkZUh8zsDIyQCCIz8ZgYGnsEejLwAAAxEkiuA=="
                channel={sessionCode}
              />
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
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
