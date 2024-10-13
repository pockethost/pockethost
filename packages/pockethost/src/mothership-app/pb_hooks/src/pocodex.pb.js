// src/pb/pb_hooks/pocodex.pb.ts
try {
  require("pocodex/dist/pb").Init();
} catch (e) {
  console.log(`WARNING: pocodex not loaded: ${e}`);
  if (e instanceof Error) {
    console.log(e.stack);
  }
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL3BiL3BiX2hvb2tzL3BvY29kZXgucGIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbInRyeSB7XG4gIHJlcXVpcmUoJ3BvY29kZXgvZGlzdC9wYicpLkluaXQoKVxufSBjYXRjaCAoZSkge1xuICBjb25zb2xlLmxvZyhgV0FSTklORzogcG9jb2RleCBub3QgbG9hZGVkOiAke2V9YClcbiAgaWYgKGUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgIGNvbnNvbGUubG9nKGUuc3RhY2spXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBQSxJQUFJO0FBQ0YsVUFBUSxpQkFBaUIsRUFBRSxLQUFLO0FBQ2xDLFNBQVMsR0FBRztBQUNWLFVBQVEsSUFBSSxnQ0FBZ0MsQ0FBQyxFQUFFO0FBQy9DLE1BQUksYUFBYSxPQUFPO0FBQ3RCLFlBQVEsSUFBSSxFQUFFLEtBQUs7QUFBQSxFQUNyQjtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=