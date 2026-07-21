<template>
  <nav class="menu-bar">
    <ul class="menu-list">
      <li v-for="(item, index) in menuItems"
          :key="item.label"
          class="menu-item"
          @mouseenter="openDropdown(index)"
          @mouseleave="closeDropdown(index)">
        <button class="menu-button">
          {{ item.label }}
        </button>
        <ul v-if="item.dropdown && item.open" class="dropdown-list">
          <li v-for="option in item.dropdown"
              :key="option.label"
              class="dropdown-item"
              :class="{ 'dropdown-item--disabled': !option.action }"
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
    dropdown: DropdownOption[];
    open: boolean;
  }

  export default {
    name: 'MenuBar',
    emits: ['navigate'],
    data() {
      return {
        menuItems: [
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
  }

    .dropdown-item:hover {
      background: #3d566e;
    }

  .dropdown-item--disabled {
    color: #93a1ac;
    cursor: not-allowed;
  }

    .dropdown-item--disabled:hover {
      background: transparent;
    }

  @media (max-width: 600px) {
    .menu-list {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-width: none;
    }

    .menu-item {
      width: 100%;
    }

    .menu-button {
      padding: 1rem;
    }

    .dropdown-list {
      position: static;
      box-shadow: none;
    }
  }
</style>
