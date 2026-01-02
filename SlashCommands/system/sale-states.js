const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Shop = require("../../Mangodb/shop.js");
const ActivePurchase = require("../../Mangodb/ActivePurchase.js");
const activeCollectors = new Map();
const SaleState = require('../../Mangodb/saleState.js');
const Types = require('../../Mangodb/types.js');
const Roles = require('../../Mangodb/roles.js');

module.exports = {
  name: "sale-state",
  description: "تــغــيــر أو عــرض حــالــة الــبــيــع والــخــدمــات",
  options: [
    {
      name: "type",
      description: "نــوع الــبــيــع أو الــخــدمــة",
      type: 3,
      required: true,
      choices: [
        { name: "نــوع مــتــجــر", value: "shop_type" },
        { name: "بــيــع مــتــاجــر", value: "sell_shop" }, // أضفت هذا الخيار
        { name: "بــيــع مــتــاجــر كــامــل", value: "full_shop_sale" },
        { name: "مــزاد", value: "auction" },
        { name: "طــلــبــات", value: "orders" },
        { name: "بــيــع رتــب", value: "role_sale" },
        { name: "خــدمــة تــنــظــيــم الــشــركــاء", value: "partners" },
        { name: "خــدمــة تــغــيــيــر اســم الــمــتــجــر", value: "rename_shop" },
        { name: "خــدمــة تــغــيــيــر صــاحــب الــمــتــجــر", value: "change_owner" },
        { name: "خــدمــة تــغــيــيــر شــكــل الــمــتــجــر", value: "change_style" },
        { name: "خــدمــة نــشــر تــلــقــائــي", value: "auto_post" },
        { name: "خــدمــة شــراء مــنــشــنــات", value: "buy_mentions" },
        { name: "خــدمــة حــذف الــمــتــجــر", value: "delete_shop" },
        { name: "خــدمــة تــفــعــيــل الــمــتــجــر الــتــلــقــائــي", value: "auto_activate_shop" },
        { name: "خــدمــة طــلــب اجــازة", value: "vacation_request" },
        { name: "خــدمــة ازالــة الــتــحــذيــرات", value: "remove_warnings" },
        { name: "خــدمــة تــغــيــيــر نــوع الــمــتــجــر", value: "change_shop_type" }
      ]
    },
    {
      name: "state",
      description: "اخــتــر حــالــة الــبــيــع",
      type: 3,
      required: false,
      choices: [
        { name: "تــفــعــيــل", value: "enable" },
        { name: "تــعــطــيــل", value: "disable" }
      ]
    },
    {
      name: "shop_type",
      description: "اخــتــر نــوع الــمــتــجــر الــمــعــيــن",
      type: 3,
      required: false,
      autocomplete: true
    },
    {
      name: "role_id",
      description: "اخــتــر الــرتبــة الــمــعــيــنــة",
      type: 3,
      required: false,
      autocomplete: true
    }
  ],

  async execute(client, interaction) {
    const saleType = interaction.options.getString("type");
    const newState = interaction.options.getString("state");
    const shopTypeName = interaction.options.getString("shop_type");
    const roleId = interaction.options.getString("role_id");

    // إذا كان نوع البيع هو "نوع متجر" ولم يتم تحديد نوع المتجر
    if (saleType === "shop_type" && !shopTypeName && newState) {
      return interaction.reply({
        content: "**يــجــب تــحــديــد نــوع الــمــتــجــر الــمــعــيــن**",
        ephemeral: true
      });
    }

    // إذا كان نوع البيع هو "بيع رتب" ولم يتم تحديد الرتبة
    if (saleType === "role_sale" && !roleId && newState) {
      return interaction.reply({
        content: "**يــجــب تــحــديــد الــرتبــة الــمــعــيــنــة**",
        ephemeral: true
      });
    }

    // جلب البيانات الحالية
    let stateData = await SaleState.findOne({
      guildId: interaction.guild.id,
      type: saleType
    });

    if (!stateData) {
      stateData = new SaleState({
        guildId: interaction.guild.id,
        type: saleType,
        state: "enable",
        disabledTypes: [],
        disabledRoles: []
      });
    }

    if (newState) {
      // إذا كان المستخدم يحاول تعطيل نوع محدد من المتاجر
      if (saleType === "shop_type" && shopTypeName) {
        if (newState === "disable") {
          // إضافة نوع المتجر إلى القائمة إذا لم يكن موجوداً
          if (!stateData.disabledTypes.includes(shopTypeName)) {
            stateData.disabledTypes.push(shopTypeName);
            await stateData.save();
            
            return interaction.reply({
              content: `**تــم تــعــطــيــل نــوع الــمــتــجــر: \`${shopTypeName}\`**`,
              ephemeral: true
            });
          } else {
            return interaction.reply({
              content: `**نــوع الــمــتــجــر \`${shopTypeName}\` مــعــطــل أصــلاً**`,
              ephemeral: true
            });
          }
        } else if (newState === "enable") {
          // إزالة نوع المتجر من القائمة إذا كان موجوداً
          const index = stateData.disabledTypes.indexOf(shopTypeName);
          if (index > -1) {
            stateData.disabledTypes.splice(index, 1);
            await stateData.save();
            
            return interaction.reply({
              content: `**تــم تــفــعــيــل نــوع الــمــتــجــر: \`${shopTypeName}\`**`,
              ephemeral: true
            });
          } else {
            return interaction.reply({
              content: `**نــوع الــمــتــجــر \`${shopTypeName}\` مــفــعــل أصــلاً**`,
              ephemeral: true
            });
          }
        }
      }
      // إذا كان المستخدم يحاول تعطيل رتبة محددة
      else if (saleType === "role_sale" && roleId) {
        if (newState === "disable") {
          // إضافة الرتبة إلى القائمة إذا لم تكن موجودة
          if (!stateData.disabledRoles.includes(roleId)) {
            stateData.disabledRoles.push(roleId);
            await stateData.save();
            
            const role = interaction.guild.roles.cache.get(roleId);
            return interaction.reply({
              content: `**تــم تــعــطــيــل الــرتبــة: ${role || roleId}**`,
              ephemeral: true
            });
          } else {
            const role = interaction.guild.roles.cache.get(roleId);
            return interaction.reply({
              content: `**الــرتبــة ${role || roleId} مــعــطــلــة أصــلاً**`,
              ephemeral: true
            });
          }
        } else if (newState === "enable") {
          // إزالة الرتبة من القائمة إذا كانت موجودة
          const index = stateData.disabledRoles.indexOf(roleId);
          if (index > -1) {
            stateData.disabledRoles.splice(index, 1);
            await stateData.save();
            
            const role = interaction.guild.roles.cache.get(roleId);
            return interaction.reply({
              content: `**تــم تــفــعــيــل الــرتبــة: ${role || roleId}**`,
              ephemeral: true
            });
          } else {
            const role = interaction.guild.roles.cache.get(roleId);
            return interaction.reply({
              content: `**الــرتبــة ${role || roleId} مــفــعــلــة أصــلاً**`,
              ephemeral: true
            });
          }
        }
      }
      else {
        // تحديث الحالة العامة للبيع/الخدمة (بما في ذلك sell_shop)
        if (stateData.state === newState) {
          return interaction.reply({
            content: `**${this.getTypeName(saleType)} ${newState === "enable" ? "مــفــعــل" : "مــعــطــل"} أصــلاً**`,
            ephemeral: true
          });
        }
        
        stateData.state = newState;
        await stateData.save();

        return interaction.reply({
          content: `**تــم ${newState === "enable" ? "تــفــعــيــل" : "تــعــطــيــل"} ${this.getTypeName(saleType)} بنجاح**`,
          ephemeral: true
        });
      }
    } else {
      // عرض الحالة الحالية
      if (saleType === "shop_type") {
        if (shopTypeName) {
          // عرض حالة نوع متجر معين
          const isDisabled = stateData.disabledTypes.includes(shopTypeName);
          
          return interaction.reply({
            content: `**حــالــة نــوع الــمــتــجــر \`${shopTypeName}\`: ${isDisabled ? '❌ مــعــطــل' : '✅ مــفــعــل'}**`,
            ephemeral: true
          });
        } else {
          // عرض جميع أنواع المتاجر المعطلة
          const disabledTypes = stateData.disabledTypes;
          
          if (disabledTypes.length === 0) {
            return interaction.reply({
              content: "**لا يــوجــد أنــواع مــتــاجــر مــعــطــلــة**",
              ephemeral: true
            });
          } else {
            return interaction.reply({
              content: `**الأنــواع الــمــعــطــلــة:\n${disabledTypes.map(t => `❌ \`${t}\``).join('\n')}**`,
              ephemeral: true
            });
          }
        }
      }
      else if (saleType === "role_sale") {
        if (roleId) {
          // عرض حالة رتبة معينة
          const isDisabled = stateData.disabledRoles.includes(roleId);
          const role = interaction.guild.roles.cache.get(roleId);
          
          return interaction.reply({
            content: `**حــالــة الــرتبــة ${role || roleId}: ${isDisabled ? '❌ مــعــطــلــة' : '✅ مــفــعــلــة'}**`,
            ephemeral: true
          });
        } else {
          // عرض جميع الرتب المعطلة
          const disabledRoles = stateData.disabledRoles;
          
          if (disabledRoles.length === 0) {
            return interaction.reply({
              content: "**لا يــوجــد رتــب مــعــطــلــة**",
              ephemeral: true
            });
          } else {
            // تحويل معرّفات الرتب إلى منشنات
            const roleMentions = disabledRoles.map(roleId => {
              const role = interaction.guild.roles.cache.get(roleId);
              return role ? `<@&${roleId}>` : `\`${roleId}\``;
            });
            
            return interaction.reply({
              content: `**الــرتــب الــمــعــطــلــة:\n${roleMentions.map(r => `❌ ${r}`).join('\n')}**`,
              ephemeral: true
            });
          }
        }
      }
      else {
        // عرض حالة البيع/الخدمة (بما في ذلك sell_shop)
        const currentState = stateData.state || 'enable';
        
        return interaction.reply({
          content: `**حــالــة ${this.getTypeName(saleType)}: ${currentState === 'enable' ? '✅ مــفــعــل' : '❌ مــعــطــل'}**`,
          ephemeral: true
        });
      }
    }
  },

  // دالة مساعدة للحصول على اسم النوع بالعربية
  getTypeName(type) {
    const typeNames = {
      'shop_type': 'نــوع مــتــجــر',
      'sell_shop': 'بــيــع مــتــاجــر',
      'full_shop_sale': 'بــيــع مــتــاجــر كــامــل',
      'auction': 'مــزاد',
      'orders': 'طــلــبــات',
      'role_sale': 'بــيــع رتــب',
      'partners': 'خــدمــة تــنــظــيــم الــشــركــاء',
      'rename_shop': 'خــدمــة تــغــيــيــر اســم الــمــتــجــر',
      'change_owner': 'خــدمــة تــغــيــيــر صــاحــب الــمــتــجــر',
      'change_style': 'خــدمــة تــغــيــيــر شــكــل الــمــتــجــر',
      'auto_post': 'خــدمــة نــشــر تــلــقــائــي',
      'buy_mentions': 'خــدمــة شــراء مــنــشــنــات',
      'delete_shop': 'خــدمــة حــذف الــمــتــجــر',
      'auto_activate_shop': 'خــدمــة تــفــعــيــل الــمــتــجــر الــتــلــقــائــي',
      'vacation_request': 'خــدمــة طــلــب اجــازة',
      'remove_warnings': 'خــدمــة ازالــة الــتــحــذيــرات',
      'change_shop_type': 'خــدمــة تــغــيــيــر نــوع الــمــتــجــر'
    };
    
    return typeNames[type] || type;
  },

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'shop_type') {
      const types = await Types.find({ guildId: interaction.guild.id });
      if (!types || types.length === 0) return interaction.respond([]);

      const focusedValue = focusedOption.value?.toLowerCase() || "";

      const filtered = types
        .filter((t) => t.name.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map((t) => ({
          name: t.name,
          value: t.name,
        }));

      await interaction.respond(filtered);
    }
    else if (focusedOption.name === 'role_id') {
      // جلب الرتب من MongoDB
      const rolesData = await Roles.find({ guildId: interaction.guild.id });
      if (!rolesData || rolesData.length === 0) return interaction.respond([]);

      const focusedValue = focusedOption.value?.toLowerCase() || "";

      const filtered = rolesData
        .filter((r) => r.roleName.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map((r) => ({
          name: r.roleName,
          value: r.roleId,
        }));

      await interaction.respond(filtered);
    }
  }
};