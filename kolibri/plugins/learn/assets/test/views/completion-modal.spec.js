import { createLocalVue, shallowMount, mount } from '@vue/test-utils';
import VueRouter from 'vue-router';

import CompletionModal from '../../src/views/CompletionModal';

const localVue = createLocalVue();
localVue.use(VueRouter);

function getCloseButton(wrapper) {
  return wrapper.findComponent({ ref: 'closeButton' });
}

function getStayHereButton(wrapper) {
  return wrapper.findComponent({ ref: 'staySection' }).findComponent({ ref: 'button' });
}

function getMoveOnButton(wrapper) {
  return wrapper.findComponent({ ref: 'nextContentNodeSection' }).findComponent({ ref: 'button' });
}

function makeWrapper({ propsData } = {}) {
  const router = new VueRouter();
  router.push('/');

  return mount(CompletionModal, {
    localVue,
    router,
    propsData,
  });
}

describe('CompletionModal', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(CompletionModal);

    expect(wrapper.exists()).toBe(true);
  });

  it('displays close button', () => {
    const wrapper = makeWrapper();

    expect(getCloseButton(wrapper).exists()).toBe(true);
  });

  it('emits `close` event on close button click', () => {
    const wrapper = makeWrapper();
    getCloseButton(wrapper).trigger('click');

    expect(wrapper.emitted().close).toBeTruthy();
    expect(wrapper.emitted().close.length).toBe(1);
  });

  describe('when a user is not logged in', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          isUserLoggedIn: false,
        },
      });
    });

    it('displays a warning message', () => {
      expect(wrapper.text()).toContain('Sign in or create an account to begin earning points');
    });

    it("doesn't display obtained points", () => {
      expect(wrapper.text()).not.toContain('+500 points');
    });
  });

  describe('when a user is logged in', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          isUserLoggedIn: true,
        },
      });
    });

    it("doesn't display a warning message", () => {
      expect(wrapper.text()).not.toContain('Sign in or create an account to begin earning points');
    });

    it('displays obtained points', () => {
      expect(wrapper.text()).toContain('+ 500 points');
    });
  });

  it("displays 'Stay and practice' section with 'Stay here' button", () => {
    const wrapper = makeWrapper();

    expect(wrapper.text()).toContain('Stay and practice');
    expect(getStayHereButton(wrapper).exists()).toBe(true);
  });

  it("emits `close` even on 'Stay here' button click", () => {
    const wrapper = makeWrapper();
    getStayHereButton(wrapper).trigger('click');

    expect(wrapper.emitted().close).toBeTruthy();
    expect(wrapper.emitted().close.length).toBe(1);
  });

  describe("when a resource doesn't have a next resource", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          nextContentNode: undefined,
        },
      });
    });

    it("doesn't display 'Keep going' section", () => {
      expect(wrapper.text()).not.toContain('Keep going');
    });
  });

  describe('when a resource has a next resource', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          nextContentNode: { title: 'Next content node' },
          nextContentNodeRoute: { path: '/next-content-node-path' },
        },
      });
    });

    it("displays 'Keep going section' with the next resource information and 'Move on' button", () => {
      expect(wrapper.text()).toContain('Keep going');
      expect(wrapper.text()).toContain('Next content node');
      expect(getMoveOnButton(wrapper).exists()).toBe(true);
    });

    it("navigates to the next resource page on 'Move on' button click", () => {
      expect(wrapper.vm.$route.path).toBe('/');
      getMoveOnButton(wrapper).trigger('click');

      expect(wrapper.vm.$route.path).toBe('/next-content-node-path');
    });
  });

  describe("when a resource doesn't have any recommended resources", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          recommendedContentNodes: undefined,
        },
      });
    });

    it("doesn't display 'You may find helpful' section", () => {
      expect(wrapper.text()).not.toContain('You may find helpful');
    });
  });

  describe('when a resource has some recommended resources', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          recommendedContentNodes: [
            { id: 'recommended-resource-1', title: 'The first recommended resource' },
            { id: 'recommended-resource-2', title: 'The second recommended resource ' },
          ],
          genContentLink: id => '/' + id + '-path',
        },
      });
    });

    it("displays 'You may find helpful' section", () => {
      expect(wrapper.text()).toContain('You may find helpful');
    });

    it('displays all recommended resources as links', () => {
      const recommendedResources = wrapper.findAll("[data-test='recommended-resource']");

      expect(recommendedResources.length).toBe(2);
      expect(recommendedResources.at(0).text()).toContain('The first recommended resource');
      expect(recommendedResources.at(0).element.tagName).toBe('A');
      expect(recommendedResources.at(1).text()).toContain('The second recommended resource');
      expect(recommendedResources.at(1).element.tagName).toBe('A');
    });

    it('navigates to the recommended resource page on the resource link click', () => {
      expect(wrapper.vm.$route.path).toBe('/');
      const recommendedResources = wrapper.findAll("[data-test='recommended-resource']");
      recommendedResources.at(1).trigger('click');

      expect(wrapper.vm.$route.path).toBe('/recommended-resource-2-path');
    });
  });
});
