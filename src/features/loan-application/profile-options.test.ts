import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeProfileSelections,
  encodeProfileSelections,
  offeredSelections,
  parentProfileParams,
  parseProfileOptions,
  pruneSlotSelections,
  type ProfileOptions,
} from "@/features/loan-application/profile-options";

const business = {
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  displayName: "Acme Pvt Ltd",
  type: "BUSINESS",
  pan: "ABCDE1234F",
};

const owner = {
  id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  displayName: "Ada Lovelace",
  type: "INDIVIDUAL",
  pan: "AAAAA1111A",
};

function sample(owners: unknown[] = []): ProfileOptions {
  return parseProfileOptions({
    promptOnCreate: true,
    slots: [
      {
        slot: "borrower",
        profileType: "BUSINESS",
        min: 1,
        max: 1,
        promptOnCreate: true,
        profiles: [business],
      },
      {
        slot: "owners",
        profileType: "INDIVIDUAL",
        min: 1,
        max: 5,
        promptOnCreate: true,
        linkedTo: "borrower",
        profiles: owners,
      },
    ],
  });
}

describe("parseProfileOptions", () => {
  it("drops slots when the program does not prompt", () => {
    const options = parseProfileOptions({
      promptOnCreate: false,
      slots: [{ slot: "borrower", profiles: [business] }],
    });
    assert.equal(options.promptOnCreate, false);
    assert.deepEqual(options.slots, []);
  });

  it("keeps only profiles of the slot type", () => {
    const options = sample();
    assert.equal(options.slots[0].profiles[0].displayName, "Acme Pvt Ltd");
    assert.equal(options.slots[1].linkedTo, "borrower");
    assert.deepEqual(options.slots[1].profiles, []);
  });

  it("rejects a profile the slot did not describe", () => {
    assert.throws(
      () =>
        parseProfileOptions({
          promptOnCreate: true,
          slots: [
            {
              slot: "borrower",
              profileType: "BUSINESS",
              min: 1,
              max: 1,
              promptOnCreate: true,
              profiles: [{ ...business, type: "INDIVIDUAL" }],
            },
          ],
        }),
      (error: { status?: number }) => error.status === 502
    );
  });
});

describe("offered profile selections", () => {
  it("asks for linked profiles only after one offered parent is selected", () => {
    const options = sample();
    assert.deepEqual(
      parentProfileParams(options.slots, [{ slot: "borrower", profileId: business.id }]),
      { borrower: business.id }
    );
    assert.deepEqual(
      parentProfileParams(options.slots, [{ slot: "borrower", profileId: "not-offered" }]),
      {}
    );
  });

  it("attaches a parent before a linked profile and drops anyone outside the response", () => {
    const options = sample([owner]);
    const accepted = offeredSelections(options, [
      { slot: "owners", profileId: owner.id },
      { slot: "owners", profileId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee" },
      { slot: "borrower", profileId: business.id },
    ]);
    assert.deepEqual(accepted, [
      { slot: "borrower", profileId: business.id },
      { slot: "owners", profileId: owner.id },
    ]);
  });

  it("does not attach a linked profile when the parent was not accepted", () => {
    const options = sample([owner]);
    assert.deepEqual(offeredSelections(options, [{ slot: "owners", profileId: owner.id }]), []);
  });

  it("stops at the slot maximum", () => {
    const second = { ...owner, id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", displayName: "Grace" };
    const third = { ...owner, id: "ffffffff-ffff-ffff-ffff-ffffffffffff", displayName: "Ken" };
    const options = parseProfileOptions({
      promptOnCreate: true,
      slots: [
        {
          slot: "owners",
          profileType: "INDIVIDUAL",
          min: 0,
          max: 2,
          promptOnCreate: true,
          profiles: [owner, second, third],
        },
      ],
    });
    const accepted = offeredSelections(
      options,
      [owner, second, third].map((profile) => ({ slot: "owners", profileId: profile.id }))
    );
    assert.deepEqual(
      accepted.map((item) => item.profileId),
      [owner.id, second.id]
    );
  });

  it("removes a linked profile that the refreshed list no longer includes", () => {
    const withOwner = sample([owner]);
    const withoutOwner = sample();
    const selected = { borrower: [business.id], owners: [owner.id] };
    assert.equal(pruneSlotSelections(withOwner.slots, selected), selected);
    assert.deepEqual(pruneSlotSelections(withoutOwner.slots, selected), {
      borrower: [business.id],
    });
  });

  it("round-trips the selection query and rejects a profile id that was not encoded", () => {
    const encoded = encodeProfileSelections([
      { slot: "borrower", profileId: business.id },
      { slot: "owners", profileId: owner.id },
    ]);
    assert.deepEqual(decodeProfileSelections(encoded), [
      { slot: "borrower", profileId: business.id },
      { slot: "owners", profileId: owner.id },
    ]);
    assert.equal(decodeProfileSelections("borrower:not offered"), null);
  });
});
