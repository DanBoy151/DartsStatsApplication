<template>
  <nav class="menu-bar">
    <ul class="menu-list">
      <li v-for="(item, index) in menuItems"
          :key="item.label"
          class="menu-item"
          @mouseenter="openDropdown(index)"
          @mouseleave="closeDropdown(index)">
        <button class="menu-button"
                :class="{ 'menu-button--active': isItemActive(item) }"
                :data-testid="item.action ? `menu-${item.action}` : undefined"
                @click="item.action && select(item.action, index)">
          {{ item.label }}
        </button>
        <ul v-if="item.dropdown && item.open" class="dropdown-list">
          <li v-for="option in item.dropdown"
              :key="option.label"
              class="dropdown-item"
              :class="{ 'dropdown-item--disabled': !option.action, 'dropdown-item--active': isOptionActive(option) }"
              :title="option.action ? undefined : 'Coming soon'"
              :aria-disabled="!option.action"
              :data-testid="option.action ? `menu-${option.action}` : undefined"
              @click="option.action && select(option.action, index)">
            {{ option.label }}
          </li>
        </ul>
      </li>
    </ul>
  </nav>

  <div class="mobile-menu-bar">
    <div class="mobile-menu-header">
      <span class="mobile-menu-title">Darts Stats</span>
      <button type="button"
              class="mobile-menu-toggle"
              data-testid="mobile-menu-toggle"
              aria-label="Menu"
              :aria-expanded="mobileMenuOpen"
              @click="toggleMobileMenu">☰</button>

      <div v-if="mobileMenuOpen" class="mobile-menu-backdrop" aria-hidden="true" @click="closeMobileMenu"></div>

      <ul v-if="mobileMenuOpen" class="mobile-drawer">
        <li v-for="item in menuItems" :key="'m-' + item.label" class="mobile-drawer-item">
          <button type="button"
                  class="mobile-drawer-button"
                  :class="{ 'mobile-drawer-button--active': isItemActive(item) }"
                  :data-testid="item.action ? `mobile-menu-${item.action}` : `mobile-menu-section-${slug(item.label)}`"
                  :aria-expanded="item.dropdown ? mobileExpandedSection === item.label : undefined"
                  @click="item.dropdown ? toggleMobileSection(item.label) : (item.action && selectMobile(item.action))">
            {{ item.label }}
            <span v-if="item.dropdown" class="mobile-drawer-caret" aria-hidden="true">{{ mobileExpandedSection === item.label ? '▾' : '▸' }}</span>
          </button>

          <ul v-if="item.dropdown && mobileExpandedSection === item.label" class="mobile-accordion-panel">
            <li v-for="option in item.dropdown"
                :key="option.label"
                class="mobile-accordion-item"
                :class="{ 'mobile-accordion-item--disabled': !option.action, 'mobile-accordion-item--active': isOptionActive(option) }"
                :title="option.action ? undefined : 'Coming soon'"
                :aria-disabled="!option.action"
                :data-testid="option.action ? `mobile-menu-${option.action}` : undefined"
                @click="option.action && selectMobile(option.action)">
              {{ option.label }}
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
  // "Past Seasons" doesn't have a page behind it yet -- there's still no
  // vue-router wired up (see main.ts), just App.vue swapping top-level views
  // by hand. It's kept visible as a roadmap of what's planned, but rendered
  // disabled so the UI doesn't imply you can click through to something that
  // doesn't exist yet. Fixtures > Current Season, Statistics > Team/Player,
  // and Manage > Players/Matches/etc are wired up (see App.vue's
  // handleNavigate) - an item becomes clickable the moment it's given an
  // `action`, which is what drives the disabled styling below.
  interface DropdownOption {
    label: string;
    // Present (and clickable) once a menu item has somewhere to navigate to; absent
    // items render disabled - see the comment above.
    action?: string;
  }

  interface MenuItem {
    label: string;
    // Present on a plain top-level link (e.g. Home) that navigates directly
    // on click and has no dropdown of its own.
    action?: string;
    dropdown?: DropdownOption[];
    open: boolean;
  }

  export default {
    name: 'MenuBar',
    props: {
      currentView: {
        type: String,
        required: true,
      },
    },
    emits: ['navigate'],
    data() {
      return {
        menuItems: [
          {
            label: 'Home',
            action: 'main',
            open: false,
          },
          {
            label: 'Fixtures',
            dropdown: [
              { label: 'Current Season', action: 'current-season' },
              { label: 'Past Seasons' },
            ],
            open: false,
          },
          {
            label: 'Statistics',
            dropdown: [{ label: 'Team', action: 'statistics' }, { label: 'Player', action: 'player-statistics' }],
            open: false,
          },
          {
            label: 'Manage',
            dropdown: [
              { label: 'Players', action: 'new-player' },
              { label: 'Matches', action: 'new-match' },
              { label: 'Leagues', action: 'new-league' },
              { label: 'Teams', action: 'new-team' },
              { label: 'Seasons', action: 'new-season' },
            ],
            open: false,
          },
        ] as MenuItem[],
        mobileMenuOpen: false,
        // Holds the open drawer section's `label`, or null when none is expanded.
        mobileExpandedSection: null as string | null,
      };
    },
    methods: {
      openDropdown(index: number) {
        const item = this.menuItems[index];
        if (item) item.open = true;
      },
      closeDropdown(index: number) {
        const item = this.menuItems[index];
        if (item) item.open = false;
      },
      select(action: string, index: number) {
        this.$emit('navigate', action);
        this.closeDropdown(index);
      },
      // `match-report` (reached via Fixtures > Current Season > View, not
      // through the menu itself) never appears as an `action` anywhere in
      // menuItems, so these simply return false for every entry while it's
      // the active view - no special-casing needed.
      isItemActive(item: MenuItem): boolean {
        if (item.action) return item.action === this.currentView;
        return item.dropdown?.some((option) => option.action === this.currentView) ?? false;
      },
      isOptionActive(option: DropdownOption): boolean {
        return !!option.action && option.action === this.currentView;
      },
      slug(label: string): string {
        return label.toLowerCase().replace(/\s+/g, '-');
      },
      toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        if (this.mobileMenuOpen) {
          const active = this.menuItems.find((item) => this.isItemActive(item));
          this.mobileExpandedSection = active?.dropdown ? active.label : null;
        }
      },
      closeMobileMenu() {
        this.mobileMenuOpen = false;
      },
      toggleMobileSection(label: string) {
        this.mobileExpandedSection = this.mobileExpandedSection === label ? null : label;
      },
      selectMobile(action: string) {
        this.$emit('navigate', action);
        this.mobileMenuOpen = false;
      },
      handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && this.mobileMenuOpen) this.closeMobileMenu();
      },
    },
    mounted() {
      window.addEventListener('keydown', this.handleKeydown);
    },
    beforeUnmount() {
      window.removeEventListener('keydown', this.handleKeydown);
    },
  };
</script>

<style scoped>
  .menu-bar {
    width: 100%;
    background: #2c3e50;
    display: flex;
    justify-content: center; /* Center the menu group */
    box-sizing: border-box;
  }

  .menu-list {
    display: flex;
    justify-content: space-between; /* Evenly space menu items */
    width: 600px; /* Fixed width for the group, adjust as needed */
    max-width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .menu-item {
    position: relative;
  }

  .menu-button {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: #ecf0f1;
    font-size: 1rem;
    padding: 1rem 2rem;
    cursor: pointer;
    width: 100%;
    text-align: center;
  }

    .menu-button:hover,
    .menu-item:hover > .menu-button {
      background: #34495e;
    }

    .menu-button--active {
      border-bottom-color: #3498db;
    }

  .dropdown-list {
    position: absolute;
    top: 100%;
    left: 0;
    background: #34495e;
    min-width: 160px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    list-style: none;
    margin: 0;
    padding: 0;
    z-index: 100;
  }

  .dropdown-item {
    padding: 0.75rem 1.5rem;
    color: #ecf0f1;
    cursor: pointer;
    white-space: nowrap;
    border-left: 3px solid transparent;
  }

    .dropdown-item:hover {
      background: #3d566e;
    }

    .dropdown-item--active {
      border-left-color: #3498db;
    }

  .dropdown-item--disabled {
    color: #93a1ac;
    cursor: not-allowed;
  }

    .dropdown-item--disabled:hover {
      background: transparent;
    }

  @media (max-width: 899px) {
    .menu-bar {
      display: none;
    }
  }

  .mobile-menu-bar {
    display: none;
  }

  @media (max-width: 899px) {
    .mobile-menu-bar {
      display: block;
      width: 100%;
      background: #2c3e50;
      box-sizing: border-box;
    }
  }

  .mobile-menu-header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    box-sizing: border-box;
  }

  .mobile-menu-title {
    color: #ecf0f1;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .mobile-menu-toggle {
    background: none;
    border: 1px solid #34495e;
    border-radius: 4px;
    color: #ecf0f1;
    font-size: 1.25rem;
    line-height: 1;
    min-width: 44px;
    min-height: 44px;
    cursor: pointer;
  }

    .mobile-menu-toggle:hover {
      background: #34495e;
    }

  .mobile-menu-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 950;
  }

  .mobile-drawer {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    background: #2c3e50;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    z-index: 951;
    max-height: calc(100vh - 56px);
    overflow-y: auto;
  }

  .mobile-drawer-item {
    border-top: 1px solid #34495e;
  }

  .mobile-drawer-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 44px;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    color: #ecf0f1;
    font-size: 1rem;
    padding: 0.75rem 1rem;
    box-sizing: border-box;
    text-align: left;
    cursor: pointer;
  }

    .mobile-drawer-button:hover {
      background: #34495e;
    }

    .mobile-drawer-button--active {
      border-left-color: #3498db;
    }

  .mobile-drawer-caret {
    color: #93a1ac;
    font-size: 0.85rem;
  }

  .mobile-accordion-panel {
    margin: 0;
    padding: 0;
    list-style: none;
    background: #243342;
  }

  .mobile-accordion-item {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 0.6rem 1rem 0.6rem 2rem;
    box-sizing: border-box;
    color: #ecf0f1;
    border-left: 3px solid transparent;
    cursor: pointer;
  }

    .mobile-accordion-item:hover {
      background: #34495e;
    }

    .mobile-accordion-item--active {
      border-left-color: #3498db;
    }

  .mobile-accordion-item--disabled {
    color: #93a1ac;
    cursor: not-allowed;
  }

    .mobile-accordion-item--disabled:hover {
      background: transparent;
    }
</style>
