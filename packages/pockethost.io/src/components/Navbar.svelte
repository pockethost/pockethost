<script lang="ts">
  import { redirect } from '$util/redirect'
  import { isLoggedIn, logOut, user } from '@pockethost/common/src/pocketbase'
  import {
    Collapse,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Nav,
    Navbar,
    NavbarBrand,
    NavbarToggler,
    NavItem,
    NavLink
  } from 'sveltestrap'
  import logo from '../assets/logo-square.png'
  import Github from './Icons/Github.svelte'
  import NavbarBrandImage from './NavbarBrandImage.svelte'
  import NavbarText from './NavbarText.svelte'
  import Title from './Title/Title.svelte'
  import { TitleSize } from './Title/types'

  let isOpen = false

  function handleUpdate(event: CustomEvent<boolean>) {
    isOpen = event.detail.valueOf()
  }

  const handleLogout = () => {
    logOut()
    redirect(`/`)
  }
</script>

<Navbar color="light" light expand="md">
  <NavbarBrand href="/">
    <NavbarBrandImage {logo} />
    <Title size={TitleSize.Nav} first="pocket" second="host" third=".io" /></NavbarBrand
  >
  <NavbarToggler on:click={() => (isOpen = !isOpen)} />
  <Collapse {isOpen} navbar expand="md" on:update={handleUpdate}>
    <Nav class="ms-auto" navbar>
      {#if isLoggedIn()}
        <NavItem />
        <NavItem>
          <NavLink href="/dashboard">Dashboard</NavLink>
        </NavItem>
        <NavItem />
        <Dropdown nav inNavbar>
          <DropdownToggle nav><Icon name="person-fill" /></DropdownToggle>
          <DropdownMenu end>
            <DropdownItem>
              <NavbarText>{user()?.email}</NavbarText>
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem><NavLink on:click={handleLogout}>Logout</NavLink></DropdownItem>
          </DropdownMenu>
        </Dropdown>
      {/if}
      {#if !isLoggedIn()}
        <NavItem>
          <NavLink href="/signup">Sign up</NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="/login">Log in</NavLink>
        </NavItem>
      {/if}
      <NavItem>
        <NavLink href="https://github.com/benallfree/pockethost"><Github /></NavLink>
      </NavItem>
    </Nav>
  </Collapse>
</Navbar>

<style lang="scss">
</style>
