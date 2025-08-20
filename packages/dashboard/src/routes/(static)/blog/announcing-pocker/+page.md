_[@cap'n](https://discord.gg/nVTxCMEcGT) Dec 20, 2024_

Well, I've decided to go rogue and solve the problem of global PocketBase hosting. The Flounder series has raised enough money for us to do this, so I'm moving forward.

We need a custom container solution for PocketHost/PocketBase. Docker is great, and individual VPS's are great if that's how you want to spend your time, but we can do a lot better.

I sat down and started testing a simple question: how many PocketBase instances can I run in a single golang binary? The results I found were astonishing from the outside, but not that surprising to me after having worked on PocketHost for a few years. A single golang process can run 1000+ PocketBase instances AT THE SAME TIME on a single 256mb VPS.

Contrast that to max 50 simultaneous instances running on a 32GB VPS with Docker. We are talking about a 20x increase in the number of instances we can run on a fraction of the hardware. It's a crazy difference.

### Built in Go

Pocker is built in Go. PocketBase is compiled directly into the Pocker binary, thus maintaining the "1 file" ethos of PocketBase. By building in golang, I have direct access to the PocketBase source and can closely control what is allowed to run, under what conditions.

### Why is this better?

Pocker can launch a PocketBase instance in about 5ms. Contrast that to 600-1000ms with Docker and you get a 200x speedup at boot time. Requests are also handled much more quickly.

It also creates options for extending PocketBase in interesting ways, such as adding SQLite extensions or AI agents. Instead of everyone having to fight to build their own custom version of PocketBase, we can do it once and share it with everyone. We can even extend the JSVM to make the extended features scriptable.

I predict these capabilities will be a huge win and game changer for the PocketBase ecosystem.

### But what about security?

Pocker is a custom container technology that allows us to run 1000+ PocketBase instances concurrently on a single VPS. Because we control all the code, Pocker can be as secure as the open source community can make it - maybe even surpassing Docker, but without all the overhead that Docker needs to be a general container technology.

In order to create a secure sandbox for each instance, there are a few JSVM capabilities we need to modify. Namely, we need to disable/modify the `$os` functions because they allow direct access to operating system features.

### But what about "bad neighbor" and resource starvation?

As of Go 1.14, the concurrency model is fully pre-emptive. That means a misbehaving goroutine will be forced to play nicely with the others. If that isn't enough, we may also need to restrict request times. So far, I don't anticipate resource starvation will be an issue because Go's concurrency model is already so good.

### But what about custom binaries?

Right, custom binaries won't be allowed. Instead, we're going to leverage JSVM (and possibly other languages) for extension via scripting. We're going to bake in support for popular extensions like SQLite extensions and AI agents. If you have a suggestion, let me know.

### Exciting times ahead

So that's the 2025 strategy. We are building a global PocketBase platform that is secure, screaming fast, and extensible.

I'm excited to see what the community comes up with.
