<template>

  <transition name="modal-fade" appear>
    <div
      class="modal-overlay"
      @keyup.esc.stop="emitCloseEvent"
      @keyup.enter="goToNextContentNode"
    >
      <div
        ref="modal"
        class="modal"
        :tabindex="0"
        role="dialog"
        aria-labelledby="modal-title"
        :style="[ modalSizeStyles, { background: $themeTokens.surface } ]"
      >
        <FocusTrap
          :firstEl="firstFocusableEl"
          :lastEl="lastFocusableEl"
        >
          <KFixedGrid
            :numCols="12"
            :style="{ margin: '24px' }"
          >
            <KFixedGridItem :span="9">
              <h1
                id="modal-title"
                class="title"
              >
                {{ $tr('resourceCompleted') }}
              </h1>
            </KFixedGridItem>
            <KFixedGridItem
              :span="3"
              alignment="right"
            >
              <!--
                leave some space for absolutely positioned close button
                to avoid overlapping with the title (the button markup is
                at the end of the modal to achieve correct focus order
                without the need to set specific tabindex on all focusable
                elements)
              -->
            </KFixedGridItem>
          </KFixedGrid>

          <div :style="contentStyle">
            <UiAlert
              v-if="!isUserLoggedIn"
              :dismissible="false"
              :removeIcon="true"
              type="warning"
              :style="{ marginTop: '8px' }"
            >
              {{ $tr('signIn') }}
            </UiAlert>
            <div
              v-else
              class="stats"
            >
              <div class="points">
                <span :style="{ color: $themeTokens.correct }">
                  {{ $tr('plusPoints', { points }) }}
                </span>
                <PointsIcon :style="{ display: 'inline-block' }" />
              </div>
              <div>{{ $tr('keepUpTheGreatProgress') }}</div>
            </div>

            <CompletionModalSection
              v-if="nextContentNode"
              ref="nextContentNodeSection"
              icon="forwardRounded"
              :class="sectionClass"
              :title="$tr('moveOnTitle')"
              :description="$tr('moveOnDescription')"
              :buttonLabel="$tr('moveOnButtonLabel')"
              :buttonRoute="nextContentNodeRoute"
            >
              <ResourceItem
                :contentNode="nextContentNode"
                size="small"
              />
            </CompletionModalSection>

            <CompletionModalSection
              ref="staySection"
              icon="restart"
              :class="sectionClass"
              :title="$tr('stayTitle')"
              :description="$tr('stayDescription')"
              :buttonLabel="$tr('stayButtonLabel')"
              @buttonClick="$emit('close')"
            />

            <CompletionModalSection
              v-if="recommendedContentNodes && recommendedContentNodes.length"
              icon="alternativeRoute"
              :class="sectionClass"
              :title="$tr('helpfulResourcesTitle')"
              :description="$tr('helpfulResourcesDescription')"
            >
              <KGrid :style="{ marginTop: '6px' }">
                <KGridItem
                  v-for="contentNode in recommendedContentNodes"
                  :key="contentNode.id"
                  :layout12="{ span: 6 }"
                  :layout8="{ span: 4 }"
                  :layout4="{ span: 4 }"
                  :style="{ marginBottom: '24px' }"
                >
                  <ResourceItem
                    data-test="recommended-resource"
                    :contentNode="contentNode"
                    :contentNodeRoute="genContentLink(contentNode.id, contentNode.is_leaf)"
                    :size="recommendedResourceItemSize"
                  />
                </KGridItem>
              </KGrid>
            </CompletionModalSection>
          </div>

          <KIconButton
            ref="closeButton"
            class="close-button"
            icon="close"
            :ariaLabel="$tr('close')"
            :tooltip="$tr('close')"
            @click="$emit('close')"
          />
        </FocusTrap>
      </div>
    </div>
  </transition>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { MaxPointsPerContent } from 'kolibri.coreVue.vuex.constants';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import CompletionModalSection from './CompletionModalSection';
  import ResourceItem from './ResourceItem';

  /**
   * A modal displayed after finishing a learning activity
   * where users can decide to continue to a next activity,
   * stay, or navigate to one of the recommended resources.
   *
   * A customized `KModal` fork (it deviates too much
   * for us to be able to use `KModal` and we don't want
   * to update KDS because this may be the only modal
   * following different patterns)
   */
  export default {
    name: 'CompletionModal',
    components: {
      FocusTrap,
      PointsIcon,
      CompletionModalSection,
      ResourceItem,
      UiAlert,
    },
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * A sign-in prompt is displayed if a user
       * is not logged in for them to be able to earn points
       * for completing the activity.
       */
      isUserLoggedIn: {
        type: Boolean,
        required: true,
      },
      /**
       * If there is a resource following the current resource,
       * "Keep going" section is displayed and a user can navigate
       * to the next resource
       */
      nextContentNode: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * vue-router link object
       * A next resource route that needs be provided
       * when `nextContentNode` is provided
       */
      nextContentNodeRoute: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * If there is at least one resource in this array
       * of recommended resources, "You may find helpful"
       * section is displayed and a user can navigate to one
       * of the resources.
       */
      recommendedContentNodes: {
        type: Array,
        required: false,
        default: null,
      },
      /**
       * A function that receives `content_node.id` and `content_node.is_leaf`
       * and returns a vue-router link object for the content node
       * used for generating target routes of recommended resources.
       * It needs be provided when `recommendedContentNodes` are provided.
       */
      genContentLink: {
        type: Function,
        required: false,
        default: () => null,
        validator(fn) {
          const link = fn(1, false);
          return validateLinkObject(link);
        },
      },
    },
    data() {
      return {
        // to be used by the modal focus trap
        firstFocusableEl: null,
        lastFocusableEl: null,
        // where the focus was before opening the modal
        // so we can return it back after it's closed
        lastFocus: null,
      };
    },
    computed: {
      points() {
        return MaxPointsPerContent;
      },
      modalSizeStyles() {
        let maxWidth = this.maxModalWidth;
        let maxHeight = this.windowHeight;

        if (this.windowBreakpoint > 1) {
          maxWidth -= 32;
          maxHeight -= 32;
        }

        return {
          maxWidth: maxWidth + 'px',
          maxHeight: maxHeight + 'px',
        };
      },
      maxModalWidth() {
        if (this.windowWidth < 1000) {
          return this.windowWidth;
        }
        return 1000;
      },
      contentStyle() {
        return {
          overflowX: 'hidden',
          padding: this.windowBreakpoint < 2 ? '0 24px' : '0 54px',
        };
      },
      sectionClass() {
        return this.$computedClass({
          ':not(:last-child)': {
            borderBottom: `1px solid ${this.$themePalette.grey.v_300}`,
          },
        });
      },
      recommendedResourceItemSize() {
        if (this.windowBreakpoint > 1) {
          return 'large';
        } else if (this.windowBreakpoint > 0) {
          return 'medium';
        } else {
          return 'small';
        }
      },
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      // Remove scrollbars from the <html> tag, so user's can't scroll while modal is open
      window.document.documentElement.style['overflow'] = 'hidden';
      this.$nextTick(() => {
        if (this.$refs.modal && !this.$refs.modal.contains(document.activeElement)) {
          this.focusModal();
        }

        if (this.nextContentNode) {
          this.firstFocusableEl = this.$refs.nextContentNodeSection.getButtonRef().$el;
        } else {
          this.firstFocusableEl = this.$refs.staySection.getButtonRef().$el;
        }
        this.lastFocusableEl = this.$refs.closeButton.$el;
      });
      window.addEventListener('focus', this.focusElementTest, true);
    },
    destroyed() {
      // Restore scrollbars to <html> tag
      window.document.documentElement.style['overflow'] = '';
      window.removeEventListener('focus', this.focusElementTest, true);
      // Wait for events to finish propagating before changing the focus.
      // Otherwise the `lastFocus` item receives events such as 'enter'.
      // (setTimeout(fn, 0) will execute the next event cycle, as soon as the main thread stack
      // is empty, not immediately. See note in
      // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Timeouts_and_intervals#settimeout)
      window.setTimeout(() => this.lastFocus.focus());
    },
    methods: {
      emitCloseEvent() {
        this.$emit('close');
      },
      goToNextContentNode() {
        this.$router.push(this.nextContentNodeRoute);
      },
      focusModal() {
        this.$refs.modal.focus();
      },
      /**
       * Forked from `KModal`
       */
      focusElementTest(event) {
        const { target } = event;
        const noopOnFocus =
          target === window || // switching apps
          !this.$refs.modal || // if $refs.modal isn't available
          target === this.$refs.modal || // addresses #3824
          this.$refs.modal.contains(target.activeElement);
        if (noopOnFocus) {
          return;
        }
        // Fixes possible infinite recursion when disconnection
        // snackbars appear along with the modal (#6301)
        const $coreSnackbar = document.getElementById('coresnackbar');
        if ($coreSnackbar && $coreSnackbar.contains(target)) {
          return;
        }
        // focus has escaped the modal - put it back!
        if (!this.$refs.modal.contains(target)) {
          this.focusModal();
        }
      },
    },
    $trs: {
      signIn: 'Sign in or create an account to begin earning points',
      resourceCompleted: 'Resource completed',
      plusPoints: '+ { points, number } points',
      keepUpTheGreatProgress: 'Keep up the great progress!',
      close: 'Close',
      moveOnTitle: 'Keep going',
      moveOnDescription: 'Move on to the next resource in the folder',
      moveOnButtonLabel: 'Move on',
      stayTitle: 'Stay and practice',
      stayDescription: 'Stay on this resource to keep practicing',
      stayButtonLabel: 'Stay here',
      helpfulResourcesTitle: 'You may find helpful',
      helpfulResourcesDescription: 'Here are some related resources we think you’ll find helpful',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    background-attachment: fixed;
    transition: opacity $core-time ease;
  }

  .modal {
    @extend %dropshadow-16dp;
    @extend %momentum-scroll;

    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    margin: 0 auto;
    overflow-y: auto;
    border-radius: $radius;
    transform: translate(-50%, -50%);

    &:focus {
      outline: none;
    }
  }

  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: all $core-time ease;
  }

  .modal-fade-enter,
  .modal-fade-leave-active {
    opacity: 0;
  }

  .title {
    margin: 0;
    font-size: 24px;
  }

  .close-button {
    position: absolute;
    top: 20px;
    right: 20px;
  }

  .stats {
    font-size: 18px;
    font-weight: bold;
    text-align: center;

    .points {
      font-size: 24px;
    }
  }

</style>
