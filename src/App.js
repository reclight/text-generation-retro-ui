import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function RetroChatbox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (input.trim()) {
      setMessages([...messages, { text: `> ${input}`, type: "user" }]);
      setMessages((prev) => [...prev, { text: "_ Generating response...", type: "bot" }]);

      const requestBody = {
        messages: [{ role: "user", content: input }],
        mode: "chat",
        stream: true,
        character: "Retrobot"
      };

      let responseText = "";

      fetch("http://127.0.0.1:5000/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }).then(async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        setMessages((prev) => prev.slice(0, -1).concat({ text: "", type: "bot" })); // Remove "Generating response..." and add empty bot message
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].delta.content) {
                  responseText += parsed.choices[0].delta.content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = responseText;
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error("Error parsing chunk: ", e);
              }
            }
          }
        }
      }).catch(error => {
        console.error("Stream error: ", error);
      });

      setInput("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-green-400 font-mono p-4">
      <div className="w-full max-w-2xl border-green-500 border-2 bg-black shadow-lg p-6 retro-terminal">
        <div className="h-[32rem] overflow-y-auto border-b-2 border-green-500 p-4 bg-black text-green-300 text-lg retro-scanlines">
          {messages.map((msg, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ duration: 0.3 }}
              className="mb-4"
            >
              <span className={msg.type === "user" ? "text-green-200" : "text-green-500"}>
                {msg.text}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="flex mt-4">
          <span className="text-green-500 text-lg">> </span>
          <input 
            className="flex-1 bg-black border-none text-green-400 placeholder-green-600 focus:ring-0 focus:outline-none p-3 font-mono text-lg retro-input" 
            placeholder="Type a command..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
        </div>
      </div>
      <style jsx>{`
        .retro-scanlines {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.1),
            rgba(0, 255, 0, 0.1) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        .retro-terminal {
          font-family: 'Courier New', Courier, monospace;
          box-shadow: 0px 0px 15px #00ff00;
          border-radius: 0px;
        }
        .retro-input {
          text-shadow: 0px 0px 5px #33ff33;
          caret-color: #33ff33;
        }
      `}</style>
    </div>
  );
}
