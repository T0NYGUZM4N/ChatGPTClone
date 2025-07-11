import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SendHorizontal } from "lucide-react";
import { useGlobal } from "./context/global-context";
import useOllamaHook from "./api/useOllamaHook";

// Esquema de validación con Zod
const messageSchema = z.object({
  text: z
    .string()
    .min(3, "El mensaje debe tener al menos 3 caracteres")
    .max(200, "El mensaje es demasiado largo"),
});

export default function App() {
  const hook = useGlobal();
  const ollamaHook = useOllamaHook();
  const [messages, setMessages] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(messageSchema),
  });

  const onSubmit = (data) => {
    setMessages((prev) => [...prev, { text: data.text, sender: "user" }]);
    reset();

    // Simular respuesta del bot
    ollamaHook.handleSubmit(data.text);
  };

  // Al recibir chunks de streaming: actualiza SOLO el último mensaje del bot
  useEffect(() => {
    if (!ollamaHook.response) return;

    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages];
      // Encuentra el último mensaje del bot (de atrás hacia adelante)
      const lastBotIndex = [...updatedMessages]
        .reverse()
        .findIndex((msg) => msg.sender === "bot");

      if (lastBotIndex !== -1) {
        const realIndex = updatedMessages.length - 1 - lastBotIndex;
        updatedMessages[realIndex] = {
          ...updatedMessages[realIndex],
          text: ollamaHook.response,
        };
      } else {
        // fallback: si no había, lo agrega
        updatedMessages.push({ text: ollamaHook.response, sender: "bot" });
      }

      return updatedMessages;
    });
  }, [ollamaHook.response]);

  // Dispara eventos al contexto global cuando cambia el historial
  useEffect(() => {
    if (!messages.length) return;
    const event = { type: "@current_chat", payload: messages };
    hook.dispatch(event);
  }, [messages]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#343541] text-white justify-end">
      <div className="flex-1 overflow-y-auto px-0 py-6 space-y-4 flex flex-col max-w-2xl mx-auto w-full">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[80%] px-4 py-3 rounded-xl shadow-sm ${
              msg.sender === "user"
                ? "bg-[#2e7dd7] self-end text-white"
                : "bg-[#444654] self-start text-gray-100"
            }`}
          >
            {msg.text}
            {ollamaHook.loading && msg.sender === "bot" && index === messages.length - 1 && (
              <span className="ml-2 animate-pulse">...</span>
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="px-4 py-4 bg-[#40414f] border-t border-[#26272b] flex items-center fixed bottom-0 w-full max-w-2xl mx-auto"
        style={{ left: "50%", transform: "translateX(-50%)" }}
      >
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          className="flex-1 p-3 rounded-xl bg-[#343541] border border-[#26272b] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("text")}
        />
        <button
          type="submit"
          className="ml-2 p-3 bg-[#19c37d] hover:bg-[#13a06b] rounded-xl transition-colors"
        >
          <SendHorizontal size={20} />
        </button>
        {errors.text && (
          <span className="text-red-400 text-sm ml-4">{errors.text.message}</span>
        )}
      </form>
    </div>
  );
}
