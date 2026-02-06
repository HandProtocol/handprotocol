import React from 'react'
import { menuItems } from '../all/TopHeader'
import MenuItem from '../all/MenuItem'
import { APP_NAME } from '../../../utils/config'

const FooterSection = () => {
  return (
    <div className="bg-s-bg w-full box-border flex flex-col sm:flex-row sm:justify-around gap-y-8 p-6 sm:p-14 sm:rounded-t-3xl rounded-t-xl">
      <div className="center w-full sm:w-fit sm:items-start gap-y-4 ">
        <div className="center-row gap-x-2">
          <img src="/logo.png" className="w-12 h-12" />
          <div className="text-xl sm:text-3xl font-semibold text-p-text">
            {APP_NAME}
          </div>
        </div>
        <div className="text-lg font-semibold text-s-text">
          Empowering Public Goods Projects
        </div>
      </div>

      {menuItems.map((item, index) => {
        if (!item?.subItems) return null
        return (
          <div key={index} className="flex sm:flex-row flex-col gap-2 sm:gap-8">
            <div className="text-lg font-bold">{item.name}</div>
            <div className="flex flex-col gap-y-2">
              {item.subItems.map((subItem, index) => (
                <MenuItem key={index} item={subItem} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FooterSection
