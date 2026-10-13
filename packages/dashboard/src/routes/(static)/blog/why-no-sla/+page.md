## Why no SLA?

PocketHost is in its 3rd year as an open source hosting service. We have never offered an SLA. Why?

### I'm just one guy

It's just me making this thing. I have to sleep sometimes. I have a life and family, and have to take care of myself. More than once, I've stopped on the side of the road in a remote area while traveling just to reboot PocketHost when something goes wrong. I leave Discord notifications on at night while I sleep. In short, the service level we have is the best I can offer without a team.

### I'm kind of averse to SLA's

Unless you are willing to pay outrageous amounts of money, SLA's are just theatre. They are a way to make you feel better about the service, but in reality, they don't mean anything because downtime is typically caused by things like hardware failures, network issues, or other things that are out of our control.

### Running it yourself is not an SLA either

The other option is to run PocketBase on your own hardware. That does not come with an SLA either. It is just you, dealing with hardware failures and network issues. You are paying PocketHost so you do not have to do that. The underlying problems still exist. I do not want to hide that. We will do the best we can, and you get a platform that is much further along than a single-machine setup. Not because you could not build one, but because a global network is not practical unless the project is huge.

### I do like uptime stats and transparency

Just because PocketHost doesn't have an SLA doesn't mean we don't care about uptime. We do care about uptime, and we do care about transparency. We have a [public uptime dashboard](https://status.pockethost.io) that shows uptime as best we can, but it's not perfect. I also think it's a little unfair to count certain types of downtime against PocketHost's reputation. If an underlying service goes down, what can we do?

An overall uptime metric is a good thing, but I think understanding PocketHost's stability as a platform is also important. So I have mixed feelings about uptime stats that aren't explained or qualified. Lies, damn lies, and statistics.

### I'd like PocketHost to be something different

I don't particularly care for hosting providers or cloud solutions. I envision PocketHost as a community-driven effort. Perhaps one day, the PocketHost users can wield some kind of control over the platform enough to manage downtime themselves. Perhaps the system can be self-healing, too. I'd rather employ these approaches than to scale out an IT team to babysit the platform. An autonomous system is a much better system.

### Conclusion

Overall, this is a personal choice I've made as the project owner. I don't seen a point in making promises that I can't really keep or control. If PocketHost grows big enough, perhaps an SLA will make more sense, but for now, I'm happy with the current state of things and am running my production apps on PocketHost without an SLA.
