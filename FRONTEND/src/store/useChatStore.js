// import { create } from "zustand";
// import toast from "react-hot-toast";
// import { axiosInstance } from "../lib/axios";
// import { Socket } from "socket.io-client";
// import { useAuthStore } from "./useAuthStore.js";

// export const useChatStore = create((set, get) => ({
//     messages: [],
//     users: [],
//     selectedUser: null,
//     isUserLoading: false,
//     isMessagesLoading: false,

//     getUsers: async () => {
//         set({ isUserLoading: true });
//         try {
//             const res = await axiosInstance.get("/messages/users");
//             set({ users: res.data });
//         } catch (error) {
//             console.error("Error fetching users:", error);
//             toast.error("Failed to load users");
//         } finally {
//             set({ isUserLoading: false });
//         }
//     },

//     getMessages: async (userId) => {
//         set({ isMessagesLoading: true });
//         try {
//             const res = await axiosInstance.get(`/messages/${userId}`);
//             set({ messages: res.data });
//         } catch (error) {
//             toast.error(error.response?.data?.message || "Failed to load messages");
//         } finally {
//             set({ isMessagesLoading: false });
//         }
//     },

//     sendMessage: async (messageData) => {
//         const { selectedUser, messages } = get();
//         try {
//             const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
//             set({ messages: [...messages, res.data] });
//         } catch (error) {
//             toast.error(error.response?.data?.message || "Failed to send message");
//         }
//     },

//     subscribeToMessages: () => {
//         const { selectedUser } = get();
//         if (!selectedUser) return;

//         const socket = useAuthStore.getState().socket;
//         const { authUser } = useAuthStore.getState();

//         socket.on("newMessage", (newMessage) => {
//             const isFromSelectedUser = newMessage.senderId === selectedUser._id;
//             const isToSelectedUser = newMessage.receiverId === selectedUser._id;

//             const isFromAuthUser = newMessage.senderId === authUser._id;
//             const isToAuthUser = newMessage.receiverId === authUser._id;

//             const isBetweenThem =
//                 (isFromAuthUser && isToSelectedUser) ||
//                 (isFromSelectedUser && isToAuthUser);
//             if (!isBetweenThem) return;
//             set({ messages: [...get().messages, newMessage] });
//         });
//     },


//     unsubscribeFromMessages: () => {
//         const socket = useAuthStore.getState().socket;
//         socket.off("newMessage");
//     },

//     setSelectedUser: (selectedUser) => set({ selectedUser }),

// }))


import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore.js";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUserLoading: false,
    isMessagesLoading: false,

    getUsers: async () => {
        set({ isUserLoading: true });
        try {
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data });
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            set({ isUserLoading: false });
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser } = get();
        const authUser = useAuthStore.getState().authUser;
        const tempClientId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

        const tempMessage = {
            _id: tempClientId, // Use tempClientId as the ID for optimistic message
            senderId: authUser._id,
            receiverId: selectedUser._id,
            text: messageData.text,
            image: messageData.image || null,
            createdAt: new Date().toISOString(),
            isAi: false,
            status: 'sending', // Indicate it's optimistically sent
            // Store the tempClientId separately to use for lookup later
            tempClientId: tempClientId,
        };

        set((state) => ({ messages: [...state.messages, tempMessage] }));

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            const serverMessage = { ...res.data, status: 'sent' };

   
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg.tempClientId === tempClientId ? serverMessage : msg
                ),
            }));

        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
            // If sending fails, remove the optimistic message
            set((state) => ({
                messages: state.messages.filter((msg) => msg.tempClientId !== tempClientId),
            }));
        }
    },

    subscribeToMessages: () => {
        const { selectedUser } = get();
        const socket = useAuthStore.getState().socket;
        const { authUser } = useAuthStore.getState();

        if (!socket || !authUser || !selectedUser) {
            console.warn("Socket, authUser, or selectedUser not available for subscription.");
            return;
        }

        console.log("Subscribing to 'newMessage' event for user:", selectedUser._id);

        const handleNewMessage = (newMessage) => {
            console.log("Received new message via socket:", newMessage);

            const isFromSelectedUser = newMessage.senderId === selectedUser._id;
            const isToSelectedUser = newMessage.receiverId === selectedUser._id;

            const isFromAuthUser = newMessage.senderId === authUser._id;
            const isToAuthUser = newMessage.receiverId === authUser._id;

            const isBetweenThem =
                (isFromAuthUser && isToSelectedUser) ||
                (isFromSelectedUser && isToAuthUser);

            if (isBetweenThem) {
                if (newMessage.senderId === authUser._id) {
                    console.log("Skipping own message received via socket (already handled by sendMessage).", newMessage._id);
                    return;
                }

                // Use the updater form of set to ensure we're working with the latest state
                set((state) => {
                    // Check if a message with this server-generated _id already exists in the current state.
                    // This is the most reliable way to prevent duplicates from socket events.
                    const messageExistsByServerId = state.messages.some(msg => msg._id === newMessage._id);

                    if (messageExistsByServerId) {
                        console.log("Message with this server ID already exists, skipping:", newMessage._id);
                        return state; 
                    } else {
                        console.log("Adding new message to state:", newMessage);
                        return { messages: [...state.messages, newMessage] };
                    }
                });
            } else {
                console.log("Message not for current chat, skipping:", newMessage);
            }
        };

        socket.on("newMessage", handleNewMessage);

        set({ _currentMessageHandler: handleNewMessage });
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        const currentHandler = get()._currentMessageHandler;

        if (socket && currentHandler) {
            console.log("Unsubscribing from 'newMessage' event.");
            socket.off("newMessage", currentHandler);
            set({ _currentMessageHandler: null }); 
        } else {
            console.warn("Socket or message handler not available for unsubscription.");
        }
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
