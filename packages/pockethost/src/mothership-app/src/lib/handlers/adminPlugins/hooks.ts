$app.onServe().bindFunc((e) => {
  e.uiExtensions.push({
    name: 'live',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/live`),
  })
  e.next()
})
