export default (AddressEU) => {
  AddressEU.validatesLengthOf('houseNumber', {max: 6})
  AddressEU.validatesLengthOf('houseNumberAddition', {max: 60, allowNull: true})
  AddressEU.validatesLengthOf('street1', {max: 60})
  AddressEU.validatesLengthOf('street2', {max: 60, allowNull: true})
  AddressEU.validatesFormatOf('zipCode', {with: /^[1-9][0-9]{3} ?(?!sa|sd|ss)[a-z]{2}$/i})
}