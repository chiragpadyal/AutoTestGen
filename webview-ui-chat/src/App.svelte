<script lang="ts">
  import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDivider,
    vsCodeTextField,
  } from "@vscode/webview-ui-toolkit";
  import { vscode } from "./utilities/vscode";
  import { onMount } from "svelte";

  // Initialize the VS Code Design System
  provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeDivider(), vsCodeTextField());

  let prompt = "";
  let messages = [{ role: "bot", content: "Hello, how can I assist you today?" }];
  let textField: any = null;
  const ask = () => {
    messages.push({ role: "user", content: prompt });
    vscode.postMessage({
      command: "ask",
      text: prompt,
    });
  };

  onMount(() => {
    window.addEventListener("message", (event) => {
      console.log(event.data);
      switch (event.data.command) {
        case "reply":
          console.log("Received a reply from the bot");
          messages.push({
            role: "bot",
            content: event.data.text,
          });
          messages = [...messages]; // Force Svelte to re-render the messages
          break;
        default:
          break;
      }
    });
    if (textField.addEventListener !== undefined) {
      textField.addEventListener("keyup", (event: any) => {
        prompt = event.target.value;
      });
    }
  });
</script>

<div class="chat-container">
  {#each messages as message}
    <div class="message-container">
      <div class="message-role">{message.role}</div>
      <div class="message-content">{message.content}</div>
    </div>
    <vscode-divider></vscode-divider>
  {/each}
</div>

<div class="search-container">
  <div class="full">
    <vscode-text-field
      bind:this={textField}
      value={prompt}
      class="form-control search-box"
      rows="3"
      style="resize: vertical;"
      minlength="15"
      placeholder="Type your message here..."
    >
      <vscode-button slot="end" appearance="icon" class="btn" on:click={ask}>
        <span class="codicon codicon-search"></span>
      </vscode-button>
    </vscode-text-field>
  </div>
</div>

<style>
  .search-container {
    position: fixed;
    bottom: 0;
    width: 90%;
    padding-bottom: 5%;
  }
  .chat-container {
    height: 90vh; /* Adjust the height as needed */
    overflow-y: auto; /* Add a scrollbar if the content overflows */
  }

  .message-container {
    margin: 10px 0;
  }

  .message-role {
    font-weight: bold;
    margin-bottom: 5px;
  }

  .message-content {
    white-space: pre-wrap; /* Preserve newlines and spaces */
  }

  .full {
    display: flex;
    align-items: end;
  }

  .search-box {
    flex-grow: 8; /* Take up 80% of the space */
    margin-right: 10px; /* Add some space between the text field and button */
  }

  .btn {
    flex-grow: 2; /* Take up 20% of the space */
  }
</style>
